import os
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage
from langchain_core.output_parsers import StrOutputParser
from app.ingestor import get_vectorstore
from app.models import ChatResponse, Source
from dotenv import load_dotenv

load_dotenv()

llm = ChatGroq(
    api_key=os.getenv("GROQ_API_KEY"),
    model="llama-3.3-70b-versatile",
    temperature=0.3,
)

# In-memory conversation histories
# Key: session_id, Value: list of messages
conversation_histories = {}

def get_history(session_id: str) -> list:
    if session_id not in conversation_histories:
        conversation_histories[session_id] = []
    return conversation_histories[session_id]

def format_history(session_id: str) -> list:
    """Convert stored history to LangChain message objects."""
    history = get_history(session_id)
    messages = []
    for msg in history[-10:]:
        if msg["role"] == "human":
            messages.append(HumanMessage(content=msg["content"]))
        else:
            messages.append(AIMessage(content=msg["content"]))
    return messages

def search_documents(
    question: str,
    workspace_id: str,
    k: int = 4
) -> list:
    """
    Search ChromaDB for the most relevant chunks
    in a specific workspace's collection.
    """
    vectorstore = get_vectorstore(workspace_id)
    results = vectorstore.similarity_search_with_score(question, k=k)
    return results

def format_context(search_results: list) -> str:
    """Format retrieved chunks into a readable context string."""
    context_parts = []
    for i, (doc, score) in enumerate(search_results):
        filename = doc.metadata.get("filename", "unknown")
        page = doc.metadata.get("page", "?")
        context_parts.append(
            f"[Source {i+1} — {filename}, page {page}]:\n{doc.page_content}"
        )
    return "\n\n".join(context_parts)

def build_system_prompt(agent_name: str) -> str:
    return (
         f"You are {agent_name}, a professional and friendly customer support assistant.\n"
        "Answer questions based ONLY on the provided knowledge base context.\n\n"
        "STRICT RULES:\n"
        "1. NEVER mention 'Source 1', 'Source 2', 'Source 3' or any source references in your answer.\n"
        "2. NEVER say 'According to Source...' or 'Based on Source...' — just answer naturally.\n"
        "3. Answer as if you simply know this information — like a knowledgeable human agent.\n"
        "4. If the answer is not in the context, say: 'I don't have that information right now. Please contact our team directly for more details.'\n"
        "5. Keep answers concise and professional — 2 to 4 sentences maximum.\n"
        "6. Never make up prices, dates, names, or specific details not in the context.\n"
        "7. Be warm and helpful — you represent the business.\n\n"
        "Knowledge base:\n{context}"
    )

def chat(
    question: str,
    session_id: str,
    workspace_id: str,
    agent_name: str = "Aria"
) -> ChatResponse:
    """
    Main RAG pipeline for Aria:
    1. Search workspace ChromaDB for relevant chunks
    2. Build prompt with context + conversation history
    3. Call Gemma2 via Groq
    4. Save to conversation history
    5. Return answer + sources
    """
    search_results = search_documents(question, workspace_id)

    if not search_results:
        return ChatResponse(
            answer=(
                "I don't have any documents in my knowledge base yet. "
                "Please upload some documents first."
            ),
            sources=[],
            session_id=session_id,
            workspace_id=workspace_id
        )

    context = format_context(search_results)
    history = format_history(session_id)
    system_prompt = build_system_prompt(agent_name)

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        MessagesPlaceholder(variable_name="history"),
        ("human", "{question}")
    ])

    chain = prompt | llm | StrOutputParser()

    answer = chain.invoke({
        "context": context,
        "history": history,
        "question": question
    })

    # Save to history
    history_store = get_history(session_id)
    history_store.append({"role": "human", "content": question})
    history_store.append({"role": "assistant", "content": answer})

    # Check if answer was found or not
    answered = "don't have information" not in answer.lower()

    # Build sources list
    sources = []
    for doc, score in search_results:
        sources.append(Source(
            doc_id=doc.metadata.get("doc_id", ""),
            filename=doc.metadata.get("filename", "unknown"),
            chunk=doc.page_content[:200] + "..." if len(doc.page_content) > 200 else doc.page_content,
            page=doc.metadata.get("page")
        ))

    return ChatResponse(
        answer=answer,
        sources=sources,
        session_id=session_id,
        workspace_id=workspace_id
    )

def clear_history(session_id: str):
    """Clear conversation history for a session."""
    if session_id in conversation_histories:
        conversation_histories[session_id] = []