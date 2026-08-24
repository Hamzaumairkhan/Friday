"""Persistent ChromaDB vector store implementation."""

import os
from typing import List, Dict, Any, Optional
from app.core.config import get_settings
from app.core.logging import get_logger
from app.vector_store.embeddings import EmbeddingProvider, get_embedding_provider

logger = get_logger("vector_store.chroma")
settings = get_settings()


class BaseVectorStore:
    """Interface for VectorStore implementations."""

    async def add_documents(self, collection_name: str, documents: List[Dict[str, Any]]) -> None:
        raise NotImplementedError

    async def search(self, collection_name: str, query: str, limit: int = 5, where: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        raise NotImplementedError

    async def delete_documents(self, collection_name: str, ids: List[str]) -> None:
        raise NotImplementedError

    async def get_by_id(self, collection_name: str, id: str) -> Optional[Dict[str, Any]]:
        raise NotImplementedError


class PersistentChromaStore(BaseVectorStore):
    """Real persistent ChromaDB vector store persisting across application restarts."""

    def __init__(self, persist_directory: str, embedding_provider: EmbeddingProvider):
        self.persist_directory = persist_directory
        self.provider = embedding_provider
        os.makedirs(self.persist_directory, exist_ok=True)
        self._client = None
        self._init_chroma()

    def _init_chroma(self):
        try:
            import chromadb
            self._client = chromadb.PersistentClient(path=self.persist_directory)
            logger.info(f"Initialized PersistentChromaStore at: {self.persist_directory}")
        except Exception as e:
            logger.warning(f"ChromaDB PersistentClient initialization warning: {e}")
            self._client = None

    def _get_collection(self, collection_name: str):
        if self._client is not None:
            return self._client.get_or_create_collection(name=collection_name)
        return None

    async def add_documents(self, collection_name: str, documents: List[Dict[str, Any]]) -> None:
        if not documents:
            return

        texts = [d["text"] for d in documents]
        ids = [d.get("id") or f"doc-{i}" for i, d in enumerate(documents)]
        metadatas = [d.get("metadata") or {} for d in documents]
        embeddings = await self.provider.embed_documents(texts)

        if self._client is not None:
            col = self._get_collection(collection_name)
            col.upsert(
                ids=ids,
                documents=texts,
                embeddings=embeddings,
                metadatas=metadatas,
            )
            logger.info(f"Persisted {len(documents)} documents into Chroma collection '{collection_name}'.")

    async def search(
        self,
        collection_name: str,
        query: str,
        limit: int = 5,
        where: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        if self._client is None:
            return []

        col = self._get_collection(collection_name)
        if col.count() == 0:
            return []

        query_embedding = await self.provider.embed_query(query)

        query_params = {
            "query_embeddings": [query_embedding],
            "n_results": min(limit, col.count()),
        }
        if where:
            query_params["where"] = where

        results = col.query(**query_params)

        matched = []
        if results and results.get("ids") and results["ids"][0]:
            for doc_id, text, meta, dist in zip(
                results["ids"][0],
                results["documents"][0],
                results["metadatas"][0] if results.get("metadatas") else [{}] * len(results["ids"][0]),
                results["distances"][0] if results.get("distances") else [0.0] * len(results["ids"][0]),
            ):
                matched.append({
                    "id": doc_id,
                    "text": text,
                    "metadata": meta,
                    "score": round(1.0 - (dist if dist is not None else 0.0), 4),
                })
        return matched

    async def delete_documents(self, collection_name: str, ids: List[str]) -> None:
        if self._client is not None:
            col = self._get_collection(collection_name)
            col.delete(ids=ids)

    async def get_by_id(self, collection_name: str, id: str) -> Optional[Dict[str, Any]]:
        if self._client is not None:
            col = self._get_collection(collection_name)
            res = col.get(ids=[id])
            if res and res.get("ids"):
                return {
                    "id": res["ids"][0],
                    "text": res["documents"][0] if res.get("documents") else "",
                    "metadata": res["metadatas"][0] if res.get("metadatas") else {},
                }
        return None


_global_vector_store: Optional[BaseVectorStore] = None


def get_vector_store() -> BaseVectorStore:
    """Get the singleton persistent Chroma vector store."""
    global _global_vector_store
    if _global_vector_store is None:
        provider = get_embedding_provider()
        _global_vector_store = PersistentChromaStore(
            persist_directory=settings.CHROMA_PATH,
            embedding_provider=provider,
        )
    return _global_vector_store
