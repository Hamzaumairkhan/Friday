"""Semantic user memory store using ChromaDB for persistent travel preferences."""

from typing import Dict, Any, List, Optional
from datetime import datetime
from app.vector_store.chroma import get_vector_store
from app.vector_store.collections import Collections
from app.core.logging import get_logger

logger = get_logger("vector_store.memory")


class UserMemoryStore:
    """Stores and retrieves non-sensitive traveler preferences in ChromaDB."""

    def __init__(self):
        self.vs = get_vector_store()

    async def save_preference(
        self,
        user_id: str,
        preference_text: str,
        category: str = "travel_style",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Save a learned traveler preference into semantic memory."""
        meta = metadata or {}
        meta.update({
            "user_id": user_id,
            "category": category,
            "saved_at": datetime.utcnow().isoformat(),
        })
        doc_id = f"pref-{user_id}-{abs(hash(preference_text)) % 1000000}"

        await self.vs.add_documents(
            collection_name=Collections.USER_MEMORY,
            documents=[{
                "id": doc_id,
                "text": preference_text,
                "metadata": meta,
            }],
        )
        logger.info(f"Saved memory for user {user_id}: {preference_text[:60]}")

    async def get_user_preferences(self, user_id: str, query: str = "travel preferences", limit: int = 3) -> List[str]:
        """Retrieve relevant traveler preferences from semantic memory."""
        results = await self.vs.search(
            collection_name=Collections.USER_MEMORY,
            query=query,
            limit=limit,
            where={"user_id": user_id},
        )
        return [r["text"] for r in results]
