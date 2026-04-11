from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# ─── Workspace ────────────────────────────────────────────
class WorkspaceCreate(BaseModel):
    name: str
    business_name: str
    agent_name: str = "Aria"
    welcome_message: str = "Hello! How can I help you today?"
    primary_color: str = "#1A56DB"

class WorkspaceResponse(BaseModel):
    workspace_id: str
    name: str
    business_name: str
    agent_name: str
    welcome_message: str
    primary_color: str
    created_at: str

# ─── Documents ────────────────────────────────────────────
class DocumentInfo(BaseModel):
    doc_id: str
    workspace_id: str
    filename: str
    chunk_count: int
    source_type: str  # "pdf" or "url"
    message: str

class DocumentListItem(BaseModel):
    doc_id: str
    filename: str
    chunk_count: int
    source_type: str

# ─── Chat ─────────────────────────────────────────────────
class ChatRequest(BaseModel):
    question: str
    session_id: str
    workspace_id: str

class Source(BaseModel):
    doc_id: str
    filename: str
    chunk: str
    page: Optional[int] = None

class ChatResponse(BaseModel):
    answer: str
    sources: List[Source]
    session_id: str
    workspace_id: str

# ─── Analytics ────────────────────────────────────────────
class ConversationLog(BaseModel):
    workspace_id: str
    session_id: str
    question: str
    answer: str
    sources_count: int
    answered: bool
    timestamp: str

class AnalyticsOverview(BaseModel):
    workspace_id: str
    total_conversations: int
    answered_rate: float
    top_questions: List[str]
    unanswered_questions: List[str]

# ─── Widget ───────────────────────────────────────────────
class WidgetConfig(BaseModel):
    workspace_id: str
    agent_name: str
    welcome_message: str
    primary_color: str
    embed_script: str