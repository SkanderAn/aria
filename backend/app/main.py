from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from typing import List
from app.models import (
    WorkspaceCreate, WorkspaceResponse,
    DocumentInfo, DocumentListItem,
    ChatRequest, ChatResponse,
    AnalyticsOverview, WidgetConfig
)
from app.workspace import (
    create_workspace, get_workspace,
    list_workspaces, delete_workspace
)
from app.ingestor import (
    ingest_pdf, ingest_url,
    get_documents, delete_document
)
from app.retriever import chat, clear_history
from app.analytics import log_conversation, get_overview
from app.core.logger import get_logger
from app.core.config import config
from app.cache import query_cache
import os

logger = get_logger("main")

app = FastAPI(
    title="Aria API",
    description="AI Customer Support Platform — Train your agent in 5 minutes",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    logger.info(f"Aria API starting up with config: LLM={config.LLM_MODEL}, Embedding={config.EMBEDDING_MODEL}")
    # Ensure static directory exists
    os.makedirs("static", exist_ok=True)

# ─── Health ────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok"}  # ⚠️ must NEVER fail

@app.get("/ping")
def ping():
    return "pong"

@app.get("/")
def root():
    return {
        "message": "Aria API running",
        "version": "2.0.0",
        "config": {
            "llm_model": getattr(config, "LLM_MODEL", "unknown"),
            "embedding_model": getattr(config, "EMBEDDING_MODEL", "unknown"),
        }
    }


# ─── Workspaces ────────────────────────────────────────────────
@app.post("/workspaces", response_model=WorkspaceResponse)
def create_new_workspace(data: WorkspaceCreate):
    """Create a new workspace for a business."""
    logger.info(f"Creating workspace: {data.name}")
    return create_workspace(data)

@app.get("/workspaces", response_model=List[WorkspaceResponse])
def get_all_workspaces():
    """List all workspaces."""
    logger.debug("Listing all workspaces")
    return list_workspaces()

@app.get("/workspaces/{workspace_id}", response_model=WorkspaceResponse)
def get_single_workspace(workspace_id: str):
    """Get a specific workspace."""
    workspace = get_workspace(workspace_id)
    if not workspace:
        logger.warning(f"Workspace not found: {workspace_id}")
        raise HTTPException(status_code=404, detail="Workspace not found")
    return workspace

@app.delete("/workspaces/{workspace_id}")
def remove_workspace(workspace_id: str):
    """Delete a workspace."""
    logger.info(f"Deleting workspace: {workspace_id}")
    success = delete_workspace(workspace_id)
    if not success:
        raise HTTPException(status_code=404, detail="Workspace not found")
    # Clear cache for this workspace
    query_cache.clear_workspace(workspace_id)
    return {"message": f"Workspace {workspace_id} deleted"}

# ─── Documents ─────────────────────────────────────────────────
@app.post("/workspaces/{workspace_id}/documents/upload",
          response_model=DocumentInfo)
async def upload_document(workspace_id: str, file: UploadFile = File(...)):
    """Upload and ingest a PDF document into a workspace."""
    workspace = get_workspace(workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    
    logger.info(f"Uploading PDF '{file.filename}' to workspace {workspace_id}")
    try:
        contents = await file.read()
        result = ingest_pdf(contents, file.filename, workspace_id)
        logger.info(f"PDF ingested: {result.doc_id}, chunks={result.chunk_count}")
        # Clear cache for this workspace after document update
        query_cache.clear_workspace(workspace_id)
        return result
    except ValueError as e:
        logger.error(f"Ingestion error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception(f"Unexpected error during PDF ingestion: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/workspaces/{workspace_id}/documents/url",
          response_model=DocumentInfo)
def ingest_from_url(workspace_id: str, payload: dict):
    """Ingest content from a website URL into a workspace."""
    workspace = get_workspace(workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    url = payload.get("url", "")
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")
    
    logger.info(f"Ingesting URL '{url}' to workspace {workspace_id}")
    try:
        result = ingest_url(url, workspace_id)
        logger.info(f"URL ingested: {result.doc_id}, chunks={result.chunk_count}")
        # Clear cache for this workspace after document update
        query_cache.clear_workspace(workspace_id)
        return result
    except ValueError as e:
        logger.error(f"Ingestion error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception(f"Unexpected error during URL ingestion: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/workspaces/{workspace_id}/documents",
         response_model=List[DocumentListItem])
def list_workspace_documents(workspace_id: str):
    """List all documents in a workspace."""
    workspace = get_workspace(workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return get_documents(workspace_id)

@app.delete("/workspaces/{workspace_id}/documents/{doc_id}")
def remove_document(workspace_id: str, doc_id: str):
    """Delete a document from a workspace."""
    logger.info(f"Deleting document {doc_id} from workspace {workspace_id}")
    success = delete_document(doc_id, workspace_id)
    if not success:
        raise HTTPException(status_code=404, detail="Document not found")
    # Clear cache for this workspace after document deletion
    query_cache.clear_workspace(workspace_id)
    return {"message": f"Document {doc_id} deleted"}

# ─── Chat ──────────────────────────────────────────────────────
@app.post("/chat", response_model=ChatResponse)
def chat_endpoint(request: ChatRequest):
    """
    Send a message to the Aria agent.
    The agent answers based on the workspace's knowledge base.
    """
    workspace = get_workspace(request.workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    logger.info(f"Chat request: session={request.session_id}, workspace={request.workspace_id}, question={request.question[:50]}...")
    try:
        response = chat(
            question=request.question,
            session_id=request.session_id,
            workspace_id=request.workspace_id,
            agent_name=workspace.agent_name,
            business_name=workspace.business_name
        )
        log_conversation(
            workspace_id=request.workspace_id,
            session_id=request.session_id,
            question=request.question,
            answer=response.answer,
            sources_count=len(response.sources)
        )
        logger.info(f"Chat response sent: {len(response.answer)} chars, {len(response.sources)} sources")
        return response
    except Exception as e:
        logger.exception(f"Chat error: {str(e)}")
        raise HTTPException(status_code=500, detail="Chat processing failed")

@app.delete("/chat/{session_id}")
def clear_chat_history(session_id: str):
    """Clear conversation history for a session."""
    logger.info(f"Clearing chat history for session {session_id}")
    clear_history(session_id)
    return {"message": "Chat history cleared"}

# ─── Analytics ─────────────────────────────────────────────────
@app.get("/workspaces/{workspace_id}/analytics",
         response_model=AnalyticsOverview)
def get_analytics(workspace_id: str):
    """Get analytics overview for a workspace."""
    workspace = get_workspace(workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return get_overview(workspace_id)

# ─── Widget ────────────────────────────────────────────────────
@app.get("/workspaces/{workspace_id}/widget",
         response_model=WidgetConfig)
def get_widget_config(workspace_id: str, base_url: str = "http://localhost:8000"):
    """
    Get the widget configuration and embeddable script.
    The business owner pastes this script on their website.
    """
    workspace = get_workspace(workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    embed_script = (
        f'<script src="{base_url}/widget.js" '
        f'data-workspace="{workspace_id}" '
        f'data-color="{workspace.primary_color}" '
        f'data-name="{workspace.agent_name}">'
        f'</script>'
    )

    return WidgetConfig(
        workspace_id=workspace_id,
        agent_name=workspace.agent_name,
        welcome_message=workspace.welcome_message,
        primary_color=workspace.primary_color,
        embed_script=embed_script
    )

# ─── Widget Static File ─────────────────────────────────────────
@app.get("/widget.js")
async def serve_widget():
    """
    Serve the widget JavaScript file for embedding on customer websites.
    """
    widget_path = "static/widget.js"
    
    # Check if widget file exists
    if not os.path.exists(widget_path):
        logger.warning(f"Widget file not found at {widget_path}")
        # Return a fallback widget that shows an error message
        fallback_widget = """
        (function() {
            console.error('Aria Widget: Widget file not properly configured. Please contact support.');
            const div = document.createElement('div');
            div.style.cssText = 'position:fixed;bottom:20px;right:20px;background:#ef4444;color:white;padding:10px;border-radius:8px;font-size:12px;z-index:9999;';
            div.innerHTML = '⚠️ Aria Widget: Configuration error';
            document.body.appendChild(div);
        })();
        """
        return HTMLResponse(content=fallback_widget, media_type="application/javascript")
    
    logger.info(f"Serving widget.js from {widget_path}")
    return FileResponse(widget_path, media_type="application/javascript")

@app.get("/widget-test")
async def test_widget_page():
    """
    Simple test page to verify widget functionality.
    Navigate to http://localhost:8000/widget-test to test the widget.
    """
    html_content = """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Aria Widget Test</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                max-width: 800px;
                margin: 0 auto;
                padding: 40px 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
            }
            .container {
                background: white;
                border-radius: 16px;
                padding: 40px;
                box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            }
            h1 {
                color: #333;
                margin-bottom: 16px;
            }
            p {
                color: #666;
                line-height: 1.6;
                margin-bottom: 24px;
            }
            .info {
                background: #f0f9ff;
                border-left: 4px solid #3b82f6;
                padding: 16px;
                border-radius: 8px;
                margin-top: 24px;
            }
            .info code {
                background: #e5e7eb;
                padding: 2px 6px;
                border-radius: 4px;
                font-family: monospace;
            }
            .workspace-selector {
                margin-bottom: 20px;
            }
            select {
                width: 100%;
                padding: 10px;
                border: 1px solid #d1d5db;
                border-radius: 8px;
                font-size: 14px;
                margin-top: 8px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🧪 Aria Widget Test Page</h1>
            <p>This is a test page to verify that your Aria chat widget is working correctly.</p>
            <p>You should see a chat button in the bottom right corner of this page.</p>
            
            <div class="workspace-selector">
                <label><strong>Select Workspace:</strong></label>
                <select id="workspace-select">
                    <option>Loading workspaces...</option>
                </select>
            </div>
            
            <div class="info">
                <strong>📝 Instructions:</strong>
                <ol style="margin-top: 8px;">
                    <li>Select a workspace from the dropdown above</li>
                    <li>The chat widget will automatically load</li>
                    <li>Click the chat button to test your AI agent</li>
                </ol>
            </div>
        </div>
        
        <script>
            let currentWidget = null;
            
            // Fetch workspaces
            fetch('http://localhost:8000/workspaces')
                .then(res => res.json())
                .then(workspaces => {
                    const select = document.getElementById('workspace-select');
                    if (workspaces.length === 0) {
                        select.innerHTML = '<option>No workspaces found. Create one first!</option>';
                        return;
                    }
                    
                    select.innerHTML = workspaces.map(w => 
                        `<option value="${w.workspace_id}" data-color="${w.primary_color}" data-name="${w.agent_name}">
                            ${w.business_name} (${w.agent_name})
                        </option>`
                    ).join('');
                    
                    // Load first workspace by default
                    loadWidget(workspaces[0]);
                    
                    // Handle workspace change
                    select.addEventListener('change', () => {
                        const selectedOption = select.options[select.selectedIndex];
                        const workspace = workspaces.find(w => w.workspace_id === selectedOption.value);
                        if (workspace) loadWidget(workspace);
                    });
                })
                .catch(err => {
                    console.error('Error fetching workspaces:', err);
                    document.getElementById('workspace-select').innerHTML = '<option>Error connecting to backend</option>';
                });
            
            function loadWidget(workspace) {
                // Remove existing widget if any
                if (currentWidget) {
                    const oldWidget = document.getElementById('aria-widget-root');
                    if (oldWidget) oldWidget.remove();
                }
                
                // Create and load new widget
                const script = document.createElement('script');
                script.src = 'http://localhost:8000/widget.js';
                script.setAttribute('data-workspace', workspace.workspace_id);
                script.setAttribute('data-color', workspace.primary_color);
                script.setAttribute('data-name', workspace.agent_name);
                script.setAttribute('data-api-url', 'http://localhost:8000');
                document.body.appendChild(script);
                currentWidget = script;
                
                console.log('Widget loaded for workspace:', workspace.workspace_id);
            }
        </script>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)

# ─── Cache Management ─────────────────────────────────────────
@app.delete("/cache")
def clear_cache():
    """Clear all cached responses (admin endpoint)."""
    logger.info("Clearing all cache")
    query_cache.clear_all()
    return {"message": "Cache cleared"}

@app.get("/cache/stats")
def cache_stats():
    """Get cache statistics (admin endpoint)."""
    return {
        "cache_size": len(query_cache.cache),
        "max_size": query_cache.max_size,
        "enabled": config.ENABLE_CACHE
    }