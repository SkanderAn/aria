from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
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

app = FastAPI(
    title="Aria API",
    description="AI Customer Support Platform — Train your agent in 5 minutes",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Health ────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"message": "Aria API is running", "version": "1.0.0"}

@app.get("/health")
def health():
    return {"status": "healthy", "version": "1.0.0"}

# ─── Workspaces ────────────────────────────────────────────────
@app.post("/workspaces", response_model=WorkspaceResponse)
def create_new_workspace(data: WorkspaceCreate):
    """Create a new workspace for a business."""
    return create_workspace(data)

@app.get("/workspaces", response_model=List[WorkspaceResponse])
def get_all_workspaces():
    """List all workspaces."""
    return list_workspaces()

@app.get("/workspaces/{workspace_id}", response_model=WorkspaceResponse)
def get_single_workspace(workspace_id: str):
    """Get a specific workspace."""
    workspace = get_workspace(workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return workspace

@app.delete("/workspaces/{workspace_id}")
def remove_workspace(workspace_id: str):
    """Delete a workspace."""
    success = delete_workspace(workspace_id)
    if not success:
        raise HTTPException(status_code=404, detail="Workspace not found")
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
    try:
        contents = await file.read()
        return ingest_pdf(contents, file.filename, workspace_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
    try:
        return ingest_url(url, workspace_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
    success = delete_document(doc_id, workspace_id)
    if not success:
        raise HTTPException(status_code=404, detail="Document not found")
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
    try:
        response = chat(
            question=request.question,
            session_id=request.session_id,
            workspace_id=request.workspace_id,
            agent_name=workspace.agent_name
        )
        log_conversation(
            workspace_id=request.workspace_id,
            session_id=request.session_id,
            question=request.question,
            answer=response.answer,
            sources_count=len(response.sources)
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/chat/{session_id}")
def clear_chat_history(session_id: str):
    """Clear conversation history for a session."""
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