import os

class Config:
    # Groq API - MUST be set in environment
    GROQ_API_KEY = os.getenv("GROQ_API_KEY")
    if not GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY environment variable is not set")
    
    # Model configurations
    EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "BAAI/bge-small-en-v1.5")
    LLM_MODEL = os.getenv("LLM_MODEL", "llama-3.3-70b-versatile")
    
    # RAG Parameters
    CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "800"))
    CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", "150"))
    RETRIEVAL_K = int(os.getenv("RETRIEVAL_K", "6"))
    TEMPERATURE = float(os.getenv("TEMPERATURE", "0.2"))
    
    # Reranking (disabled on Railway to save resources)
    USE_RERANKER = os.getenv("USE_RERANKER", "false").lower() == "true"
    RERANKER_MODEL = os.getenv("RERANKER_MODEL", "cross-encoder/ms-marco-MiniLM-L-6-v2")
    
    # Cache
    ENABLE_CACHE = os.getenv("ENABLE_CACHE", "true").lower() == "true"
    CACHE_SIZE = int(os.getenv("CACHE_SIZE", "100"))
    
    # ChromaDB - must use writable path on Railway
    CHROMA_PATH = os.getenv("CHROMA_PATH", "/tmp/chroma_db")
    
    # Query Expansion (disabled on Railway)
    ENABLE_QUERY_EXPANSION = os.getenv("ENABLE_QUERY_EXPANSION", "false").lower() == "true"

config = Config()