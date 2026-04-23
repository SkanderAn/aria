import os
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import PromptTemplate
from app.ingestor import get_vectorstore
from app.models import ChatResponse, Source
from app.core.config import config
from app.cache import query_cache
from app.reranker import reranker
from dotenv import load_dotenv

load_dotenv()

# Available Groq models (as of 2024)
GROQ_MODELS = [
    "llama-3.3-70b-versatile",  
]

def get_llm_with_fallback():
    """Initialize LLM with fallback models if primary fails"""
    primary_model = config.LLM_MODEL
    
    # First try the configured model
    try:
        return ChatGroq(
            api_key=config.GROQ_API_KEY,
            model=primary_model,
            temperature=config.TEMPERATURE,
            max_tokens=500,
            timeout=30,
            max_retries=2,
        )
    except Exception as e:
        print(f"Failed to load {primary_model}: {e}")
        
        # Try fallback models
        for model in GROQ_MODELS:
            if model == primary_model:
                continue
            try:
                print(f"Attempting fallback to {model}")
                return ChatGroq(
                    api_key=config.GROQ_API_KEY,
                    model=model,
                    temperature=config.TEMPERATURE,
                    max_tokens=500,
                    timeout=30,
                    max_retries=2,
                )
            except Exception as e2:
                print(f"Failed to load {model}: {e2}")
                continue
        
        # If all fail, raise error
        raise Exception("No available Groq models found. Please check your API key and internet connection.")

# Initialize LLM with fallback
llm = get_llm_with_fallback()

# In-memory conversation histories
conversation_histories = {}

def get_history(session_id: str) -> list:
    if session_id not in conversation_histories:
        conversation_histories[session_id] = []
    return conversation_histories[session_id]

def format_history(session_id: str) -> list:
    """Convert stored history to LangChain message objects."""
    history = get_history(session_id)
    messages = []
    # Keep last 10 messages for context but limit token usage
    for msg in history[-10:]:
        if msg["role"] == "human":
            messages.append(HumanMessage(content=msg["content"]))
        else:
            messages.append(AIMessage(content=msg["content"]))
    return messages

def expand_query(question: str) -> list:
    """Generate multiple query variations for better retrieval"""
    if not config.ENABLE_QUERY_EXPANSION:
        return [question]
    
    expand_prompt = PromptTemplate.from_template("""
    Given the user's question, generate 2 alternative ways to ask the same question
    that might help find relevant information in a knowledge base.
    Keep them concise and focused on key information needs.
    
    Original: {question}
    
    Alternative questions (one per line, numbered 1 and 2):
    """)
    
    try:
        # Use a smaller/faster model for query expansion to save costs
        expansion_llm = ChatGroq(
            api_key=config.GROQ_API_KEY,
            model="llama-3.1-8b-instant",  # Faster model for expansion
            temperature=0.1,
            max_tokens=150,
        )
        chain = expand_prompt | expansion_llm | StrOutputParser()
        alternatives = chain.invoke({"question": question})
        
        queries = [question]
        for line in alternatives.strip().split('\n'):
            if line and line[0].isdigit():
                # Extract the question part after the number
                alt_query = line.split('.', 1)[1].strip() if '.' in line else line[1:].strip()
                queries.append(alt_query)
        
        return queries[:3]  # Max 3 queries total
    except Exception as e:
        print(f"Query expansion failed: {e}")
        return [question]

def search_with_expansion(question: str, workspace_id: str, k: int = None) -> list:
    """Search with query expansion and reranking"""
    if k is None:
        k = config.RETRIEVAL_K
    
    # Get original query results
    original_results = search_documents(question, workspace_id, k * 2)
    
    # Generate and search expanded queries
    expanded_queries = expand_query(question)
    all_results = list(original_results)
    
    # Get results from expanded queries (if enabled)
    if len(expanded_queries) > 1:
        for query in expanded_queries[1:]:
            try:
                results = search_documents(query, workspace_id, k)
                all_results.extend(results)
            except Exception as e:
                print(f"Expanded query failed: {e}")
                continue
    
    # Deduplicate based on document ID and page
    unique_results = {}
    for doc, score in all_results:
        doc_id = doc.metadata.get("doc_id", "")
        page = doc.metadata.get("page", 0)
        chunk_idx = doc.metadata.get("chunk_index", 0)
        unique_key = f"{doc_id}_{page}_{chunk_idx}"
        
        if unique_key not in unique_results or score > unique_results[unique_key][1]:
            unique_results[unique_key] = (doc, score)
    
    # Sort by score
    sorted_results = sorted(unique_results.values(), key=lambda x: x[1], reverse=True)
    
    # Apply reranking if available
    if config.USE_RERANKER and sorted_results:
        docs = [doc for doc, _ in sorted_results[:k*2]]
        reranked = reranker.rerank(question, docs, top_k=k)
        return reranked
    
    return sorted_results[:k]

def search_documents(
    question: str,
    workspace_id: str,
    k: int = None
) -> list:
    """
    Search ChromaDB for the most relevant chunks
    in a specific workspace's collection.
    """
    if k is None:
        k = config.RETRIEVAL_K
    
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
            f"[Document {i+1} — {filename}, page {page}]:\n{doc.page_content}"
        )
    return "\n\n---\n\n".join(context_parts)

def build_enhanced_system_prompt(agent_name: str, business_name: str = "") -> str:
    """Enhanced prompt with better guidelines"""
    return f"""
You are {agent_name}{f' from {business_name}' if business_name else ''}, an expert customer support AI assistant.

CONTEXT GUIDELINES:
- Use ONLY the provided knowledge base to answer questions
- If information isn't in the context, admit it politely
- Answer naturally as if you know the information
- Never mention "Source X", "According to the document", or similar references

ANSWER FORMAT:
- Be concise but thorough (2-5 sentences maximum)
- Use bullet points ONLY for lists, steps, or multiple items
- Maintain a professional, helpful, and friendly tone
- Include relevant specific information (prices, dates, policies) exactly as stated in the context

WHEN YOU DON'T KNOW:
Say EXACTLY: "I don't have that information in my knowledge base. Please contact our support team for assistance."

HANDLING SPECIFIC QUESTIONS:
- For pricing: Only provide if exact price exists in context
- For dates/policies: Provide verbatim from context
- For product details: Summarize accurately from context

NEVER:
- Hallucinate or make up information
- Add prices, dates, or policies not in context
- Mention internal retrieval mechanics or document IDs
- Use phrases like "Based on the context" or "According to the source"

Knowledge Base:
{{context}}
"""

def chat(
    question: str,
    session_id: str,
    workspace_id: str,
    agent_name: str = "Aria",
    business_name: str = ""
) -> ChatResponse:
    """
    Main RAG pipeline for Aria:
    1. Check cache
    2. Search workspace with query expansion
    3. Rerank results
    4. Build prompt with context + conversation history
    5. Call LLM via Groq
    6. Save to conversation history
    7. Cache response
    8. Return answer + sources
    """
    
    # Check cache first
    if config.ENABLE_CACHE:
        cached_response = query_cache.get(question, workspace_id, session_id)
        if cached_response:
            return ChatResponse(**cached_response)
    
    # Search with query expansion
    search_results = search_with_expansion(question, workspace_id)
    
    if not search_results:
        response = ChatResponse(
            answer=(
                "I don't have any documents in my knowledge base yet. "
                "Please upload some documents first so I can help you better."
            ),
            sources=[],
            session_id=session_id,
            workspace_id=workspace_id
        )
        
        # Cache the response
        if config.ENABLE_CACHE:
            query_cache.set(question, workspace_id, session_id, response.dict())
        
        return response
    
    context = format_context(search_results)
    history = format_history(session_id)
    system_prompt = build_enhanced_system_prompt(agent_name, business_name)
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        MessagesPlaceholder(variable_name="history"),
        ("human", "{question}")
    ])
    
    chain = prompt | llm | StrOutputParser()
    
    try:
        answer = chain.invoke({
            "context": context,
            "history": history,
            "question": question
        })
    except Exception as e:
        print(f"LLM invocation error: {e}")
        answer = "I'm having trouble processing your request right now. Please try again in a moment."
    
    # Save to history
    history_store = get_history(session_id)
    history_store.append({"role": "human", "content": question})
    history_store.append({"role": "assistant", "content": answer})
    
    # Limit history size to prevent context overflow
    if len(history_store) > 20:
        conversation_histories[session_id] = history_store[-20:]
    
    # Build sources list (deduplicate)
    sources = []
    seen_sources = set()
    for doc, score in search_results[:4]:  # Limit to top 4 sources
        doc_id = doc.metadata.get("doc_id", "")
        page = doc.metadata.get("page")
        source_key = f"{doc_id}_{page}"
        
        if source_key not in seen_sources:
            seen_sources.add(source_key)
            sources.append(Source(
                doc_id=doc_id,
                filename=doc.metadata.get("filename", "unknown"),
                chunk=doc.page_content[:200] + "..." if len(doc.page_content) > 200 else doc.page_content,
                page=page
            ))
    
    response = ChatResponse(
        answer=answer,
        sources=sources,
        session_id=session_id,
        workspace_id=workspace_id
    )
    
    # Cache the response
    if config.ENABLE_CACHE:
        query_cache.set(question, workspace_id, session_id, response.dict())
    
    return response

def clear_history(session_id: str):
    """Clear conversation history for a session."""
    if session_id in conversation_histories:
        conversation_histories[session_id] = []