from sentence_transformers import CrossEncoder
from typing import List, Tuple
from langchain_core.documents import Document
from app.core.config import config

class Reranker:
    """Cross-encoder reranking for better retrieval accuracy"""
    
    def __init__(self):
        self.model = None
        if config.USE_RERANKER:
            try:
                self.model = CrossEncoder(config.RERANKER_MODEL)
            except Exception as e:
                print(f"Warning: Could not load reranker model: {e}")
    
    def rerank(self, query: str, documents: List[Document], top_k: int = 3) -> List[Tuple[Document, float]]:
        """Rerank documents based on cross-encoder scores"""
        if not self.model or not documents:
            return [(doc, 1.0) for doc in documents[:top_k]]
        
        # Prepare pairs for cross-encoder
        pairs = [[query, doc.page_content] for doc in documents]
        
        # Get relevance scores
        scores = self.model.predict(pairs)
        
        # Sort by score
        ranked = sorted(zip(documents, scores), key=lambda x: x[1], reverse=True)
        
        return ranked[:top_k]

# Global reranker instance
reranker = Reranker()