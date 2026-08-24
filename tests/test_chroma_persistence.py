"""Tests for ChromaDB Vector Store & User Memory Store."""

import uuid
from app.vector_store.chroma import get_vector_store
from app.vector_store.collections import Collections
from app.vector_store.memory import UserMemoryStore


def test_chroma_document_persistence(run_async):
    """Verify document insertion and retrieval in ChromaDB."""
    async def _test():
        vs = get_vector_store()
        doc_id = f"test-doc-skardu-{uuid.uuid4().hex[:6]}"
        docs = [
            {
                "id": doc_id,
                "text": "Skardu is the center of trekking in Gilgit-Baltistan with Shangrila and Deosai.",
                "metadata": {"destination": "Skardu", "type": "guide"},
            }
        ]

        await vs.add_documents(Collections.TRAVEL_KNOWLEDGE, docs)

        results = await vs.search(
            collection_name=Collections.TRAVEL_KNOWLEDGE,
            query="Deosai trekking",
            limit=1,
        )
        assert len(results) >= 1
        assert "text" in results[0]

    run_async(_test())


def test_user_memory_store(run_async):
    """Verify storing and retrieving semantic user travel preferences."""
    async def _test():
        memory = UserMemoryStore()
        user_id = f"user-test-memory-{uuid.uuid4().hex[:6]}"

        await memory.save_preference(
            user_id=user_id,
            preference_text="Traveler prefers budget guest houses and local street food in Northern Pakistan.",
            category="travel_style",
        )

        prefs = await memory.get_user_preferences(user_id=user_id, query="food and hotel preferences")
        assert len(prefs) >= 1
        assert "guest houses" in prefs[0]

    run_async(_test())
