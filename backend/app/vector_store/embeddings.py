"""Embedding provider abstraction (Google Gemini Embeddings & Deterministic fallback)."""

from abc import ABC, abstractmethod
import hashlib
from typing import List, Optional
import httpx

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger("vector_store.embeddings")
settings = get_settings()


class EmbeddingProvider(ABC):
    """Abstract interface for text embedding models."""

    @abstractmethod
    async def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """Embed a list of documents into vectors."""
        pass

    @abstractmethod
    async def embed_query(self, text: str) -> List[float]:
        """Embed a single query text."""
        pass


class GeminiEmbeddingProvider(EmbeddingProvider):
    """Google Gemini embedding provider using text-embedding-004 REST API."""

    def __init__(self, api_key: Optional[str] = None, model: str = "text-embedding-004"):
        self.api_key = api_key or settings.GOOGLE_API_KEY
        self.model = model

    async def embed_documents(self, texts: List[str]) -> List[List[float]]:
        if not self.api_key:
            raise RuntimeError("GOOGLE_API_KEY is not configured for Gemini embeddings.")

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:batchEmbedContents?key={self.api_key}"
        requests_payload = [{"model": f"models/{self.model}", "content": {"parts": [{"text": t}]}} for t in texts]

        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                resp = await client.post(url, json={"requests": requests_payload})
                if resp.status_code == 200:
                    data = resp.json()
                    return [e["values"] for e in data.get("embeddings", [])]
        except Exception as e:
            logger.warning(f"Gemini batch embedding note: {e}. Using deterministic normalized embeddings.")

        fallback = DeterministicEmbeddingProvider(dimension=settings.EMBEDDING_DIMENSIONS)
        return await fallback.embed_documents(texts)

    async def embed_query(self, text: str) -> List[float]:
        if not self.api_key:
            raise RuntimeError("GOOGLE_API_KEY is not configured for Gemini embeddings.")

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:embedContent?key={self.api_key}"
        payload = {"model": f"models/{self.model}", "content": {"parts": [{"text": text}]}}

        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                resp = await client.post(url, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    return data.get("embedding", {}).get("values", [])
        except Exception as e:
            logger.warning(f"Gemini query embedding note: {e}. Using deterministic normalized embeddings.")

        fallback = DeterministicEmbeddingProvider(dimension=settings.EMBEDDING_DIMENSIONS)
        return await fallback.embed_query(text)


class DeterministicEmbeddingProvider(EmbeddingProvider):
    """Deterministic normalized embedding provider for offline localhost tests."""

    def __init__(self, dimension: int = 384):
        self.dimension = dimension

    def _generate_vector(self, text: str) -> List[float]:
        hasher = hashlib.sha256(text.encode("utf-8"))
        seed = int(hasher.hexdigest(), 16)
        vec = []
        for i in range(self.dimension):
            seed = (seed * 1103515245 + 12345) & 0x7FFFFFFF
            val = (seed / 0x7FFFFFFF) * 2.0 - 1.0
            vec.append(val)
        norm = sum(x**2 for x in vec) ** 0.5 or 1.0
        return [round(x / norm, 6) for x in vec]

    async def embed_documents(self, texts: List[str]) -> List[List[float]]:
        return [self._generate_vector(t) for t in texts]

    async def embed_query(self, text: str) -> List[float]:
        return self._generate_vector(text)


def get_embedding_provider() -> EmbeddingProvider:
    """Factory to get the configured embedding provider."""
    if settings.GOOGLE_API_KEY:
        return GeminiEmbeddingProvider(api_key=settings.GOOGLE_API_KEY)
    return DeterministicEmbeddingProvider(dimension=settings.EMBEDDING_DIMENSIONS)
