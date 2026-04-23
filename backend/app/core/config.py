from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    # API
    API_TITLE: str = "Aria API"
    API_VERSION: str = "1.0.0"
    API_DESCRIPTION: str = "AI Customer Support Platform — Train your agent in 5 minutes"
    
    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:3001"]
    
    # LLM
    GROQ_API_KEY: str
    LLM_MODEL: str = "llama-3.3-70b-versatile"
    LLM_TEMPERATURE: float = 0.3
    
    # Embeddings
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    EMBEDDING_DEVICE: str = "cpu"
    
    # Vector Store
    CHROMA_PERSIST_DIR: str = "./chroma_db"
    
    # Storage (JSON files for now)
    WORKSPACES_FILE: str = "./workspaces.json"
    ANALYTICS_FILE: str = "./analytics.json"
    
    # Logging
    LOG_LEVEL: str = "INFO"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True

settings = Settings()