import hashlib
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from collections import OrderedDict

class QueryCache:
    """LRU Cache for chat responses"""
    
    def __init__(self, max_size: int = 100, ttl_minutes: int = 60):
        self.cache: OrderedDict = OrderedDict()
        self.max_size = max_size
        self.ttl = timedelta(minutes=ttl_minutes)
    
    def _get_key(self, question: str, workspace_id: str, session_id: str) -> str:
        """Generate cache key"""
        content = f"{question}:{workspace_id}:{session_id}"
        return hashlib.md5(content.encode()).hexdigest()
    
    def get(self, question: str, workspace_id: str, session_id: str) -> Optional[Dict[str, Any]]:
        """Get cached response if exists and not expired"""
        key = self._get_key(question, workspace_id, session_id)
        
        if key in self.cache:
            value, timestamp = self.cache[key]
            if datetime.now() - timestamp < self.ttl:
                # Move to end (most recently used)
                self.cache.move_to_end(key)
                return value
            else:
                # Remove expired
                del self.cache[key]
        
        return None
    
    def set(self, question: str, workspace_id: str, session_id: str, response: Dict[str, Any]):
        """Cache a response"""
        key = self._get_key(question, workspace_id, session_id)
        
        # Remove if already exists
        if key in self.cache:
            del self.cache[key]
        
        # Check size limit
        if len(self.cache) >= self.max_size:
            self.cache.popitem(last=False)
        
        self.cache[key] = (response, datetime.now())
    
    def clear_workspace(self, workspace_id: str):
        """Clear all cache entries for a workspace"""
        keys_to_delete = []
        for key in self.cache:
            if workspace_id in key:
                keys_to_delete.append(key)
        
        for key in keys_to_delete:
            del self.cache[key]
    
    def clear_all(self):
        """Clear entire cache"""
        self.cache.clear()

# Global cache instance
query_cache = QueryCache()