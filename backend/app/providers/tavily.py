"""Tavily web research provider."""

from typing import Dict, Any, List, Optional
from datetime import datetime
from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger("providers.tavily")
settings = get_settings()


class TavilyProvider:
    """Real web research provider utilizing Tavily API."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.TAVILY_API_KEY

    async def search(self, query: str, max_results: int = 5) -> Dict[str, Any]:
        """Execute web search and return structured evidence items."""
        if not self.api_key:
            raise RuntimeError("TAVILY_API_KEY is not configured.")

        try:
            from tavily import TavilyClient
            client = TavilyClient(api_key=self.api_key)
            response = client.search(
                query=query,
                max_results=max_results,
                search_depth="advanced",
                include_answer=True,
            )

            results = []
            for item in response.get("results", []):
                results.append({
                    "title": item.get("title"),
                    "url": item.get("url"),
                    "snippet": item.get("content"),
                    "source": "tavily",
                    "retrieved_at": datetime.utcnow().isoformat(),
                    "score": item.get("score", 0.0),
                })

            return {
                "success": True,
                "query": query,
                "answer": response.get("answer"),
                "results": results,
                "total_results": len(results),
                "source": "tavily",
                "retrieved_at": datetime.utcnow().isoformat(),
            }
        except Exception as e:
            logger.error(f"Tavily search error: {e}")
            raise RuntimeError(f"Tavily API failed: {e}")
