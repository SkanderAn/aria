import json
import os
from datetime import datetime
from app.models import ConversationLog, AnalyticsOverview
from collections import Counter

ANALYTICS_FILE = "./analytics.json"

def load_analytics() -> list:
    if not os.path.exists(ANALYTICS_FILE):
        return []
    with open(ANALYTICS_FILE, "r") as f:
        return json.load(f)

def save_analytics(logs: list):
    with open(ANALYTICS_FILE, "w") as f:
        json.dump(logs, f, indent=2)

def log_conversation(
    workspace_id: str,
    session_id: str,
    question: str,
    answer: str,
    sources_count: int
):
    """
    Log every conversation to disk.
    This is what powers the analytics dashboard.
    """
    logs = load_analytics()
    answered = "don't have information" not in answer.lower()

    log = {
        "workspace_id": workspace_id,
        "session_id": session_id,
        "question": question,
        "answer": answer,
        "sources_count": sources_count,
        "answered": answered,
        "timestamp": datetime.now().isoformat()
    }

    logs.append(log)
    save_analytics(logs)

def get_overview(workspace_id: str) -> AnalyticsOverview:
    """
    Compute analytics for a specific workspace:
    - Total conversations
    - Answer rate
    - Top 5 most asked questions
    - Unanswered questions (gaps in knowledge base)
    """
    logs = load_analytics()
    workspace_logs = [l for l in logs if l["workspace_id"] == workspace_id]

    if not workspace_logs:
        return AnalyticsOverview(
            workspace_id=workspace_id,
            total_conversations=0,
            answered_rate=0.0,
            top_questions=[],
            unanswered_questions=[]
        )

    total = len(workspace_logs)
    answered = sum(1 for l in workspace_logs if l["answered"])
    answered_rate = round((answered / total) * 100, 1)

    # Most asked questions
    question_counts = Counter(l["question"] for l in workspace_logs)
    top_questions = [q for q, _ in question_counts.most_common(5)]

    # Unanswered questions — gaps in knowledge base
    unanswered = [
        l["question"] for l in workspace_logs
        if not l["answered"]
    ]
    unique_unanswered = list(dict.fromkeys(unanswered))[:10]

    return AnalyticsOverview(
        workspace_id=workspace_id,
        total_conversations=total,
        answered_rate=answered_rate,
        top_questions=top_questions,
        unanswered_questions=unique_unanswered
    )