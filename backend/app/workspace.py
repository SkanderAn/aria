import json
import os
import uuid
from datetime import datetime
from app.models import WorkspaceCreate, WorkspaceResponse

WORKSPACES_FILE = "./workspaces.json"

def load_workspaces() -> dict:
    """Load all workspaces from the JSON file."""
    if not os.path.exists(WORKSPACES_FILE):
        return {}
    with open(WORKSPACES_FILE, "r") as f:
        return json.load(f)

def save_workspaces(workspaces: dict):
    """Save all workspaces to the JSON file."""
    with open(WORKSPACES_FILE, "w") as f:
        json.dump(workspaces, f, indent=2)

def create_workspace(data: WorkspaceCreate) -> WorkspaceResponse:
    """
    Create a new workspace for a business.
    Each workspace gets a unique ID used to isolate
    its data in ChromaDB.
    """
    workspaces = load_workspaces()
    workspace_id = str(uuid.uuid4())[:8]

    workspace = {
        "workspace_id": workspace_id,
        "name": data.name,
        "business_name": data.business_name,
        "agent_name": data.agent_name,
        "welcome_message": data.welcome_message,
        "primary_color": data.primary_color,
        "created_at": datetime.now().isoformat()
    }

    workspaces[workspace_id] = workspace
    save_workspaces(workspaces)

    return WorkspaceResponse(**workspace)

def get_workspace(workspace_id: str) -> WorkspaceResponse:
    """Get a workspace by ID."""
    workspaces = load_workspaces()
    if workspace_id not in workspaces:
        return None
    return WorkspaceResponse(**workspaces[workspace_id])

def list_workspaces() -> list:
    """List all workspaces."""
    workspaces = load_workspaces()
    return [WorkspaceResponse(**w) for w in workspaces.values()]

def delete_workspace(workspace_id: str) -> bool:
    """Delete a workspace and all its data."""
    workspaces = load_workspaces()
    if workspace_id not in workspaces:
        return False
    del workspaces[workspace_id]
    save_workspaces(workspaces)
    return True