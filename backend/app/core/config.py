import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Groq API
    GROQ_API_KEY = os.getenv("GROQ_API_KEY")
    
    # Model configurations
    EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "BAAI/bge-small-en-v1.5")
    LLM_MODEL = os.getenv("LLM_MODEL", "llama3-70b-8192")
    
    # RAG Parameters
    CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", 800))
    CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", 150))
    RETRIEVAL_K = int(os.getenv("RETRIEVAL_K", 6))
    TEMPERATURE = float(os.getenv("TEMPERATURE", 0.2))
    
    # Reranking
    USE_RERANKER = os.getenv("USE_RERANKER", "true").lower() == "true"
    RERANKER_MODEL = os.getenv("RERANKER_MODEL", "cross-encoder/ms-marco-MiniLM-L-6-v2")
    
    # Cache
    ENABLE_CACHE = os.getenv("ENABLE_CACHE", "true").lower() == "true"
    CACHE_SIZE = int(os.getenv("CACHE_SIZE", 100))
    
    # ChromaDB
    CHROMA_PATH = os.getenv("CHROMA_PATH", "./chroma_db")
    
    # Query Expansion
    ENABLE_QUERY_EXPANSION = os.getenv("ENABLE_QUERY_EXPANSION", "true").lower() == "true"

config = Config()