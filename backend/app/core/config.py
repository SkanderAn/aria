import os
from dotenv import load_dotenv

# Only load .env in development
if not os.getenv("RAILWAY_ENVIRONMENT"):
    load_dotenv()

class Config:
    GROQ_API_KEY = os.getenv("GROQ_API_KEY")
    EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "BAAI/bge-small-en-v1.5")
    LLM_MODEL = os.getenv("LLM_MODEL", "llama-3.3-70b-versatile")
    CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", 800))
    CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", 150))
    RETRIEVAL_K = int(os.getenv("RETRIEVAL_K", 6))
    TEMPERATURE = float(os.getenv("TEMPERATURE", 0.2))
    USE_RERANKER = os.getenv("USE_RERANKER", "true").lower() == "true"
    ENABLE_CACHE = os.getenv("ENABLE_CACHE", "true").lower() == "true"
    CACHE_SIZE = int(os.getenv("CACHE_SIZE", 100))
    CHROMA_PATH = os.getenv("CHROMA_PATH", "/app/chroma_db")
    ENABLE_QUERY_EXPANSION = os.getenv("ENABLE_QUERY_EXPANSION", "true").lower() == "true"

config = Config()