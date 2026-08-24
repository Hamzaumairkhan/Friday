"""Web research tool using Tavily API with evidence metadata and source transparency."""

from typing import Dict, Any, List, Optional
from datetime import datetime
from app.providers.tavily import TavilyProvider
from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger("tools.web_search")
settings = get_settings()


class WebSearchTool:
    """Tavily web search tool for destination research and live travel advisories with source transparency."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.TAVILY_API_KEY
        self.provider = TavilyProvider(api_key=self.api_key) if self.api_key else None

    async def search(self, query: str, max_results: int = 5) -> Dict[str, Any]:
        """Perform real web search via Tavily, returning evidence items."""
        if not query or not query.strip():
            return {
                "success": False,
                "query": "",
                "source": "validation_error",
                "source_type": "invalid_input",
                "data": None,
                "error": "Query cannot be empty.",
            }

        if self.provider and self.api_key:
            try:
                res = await self.provider.search(query=query, max_results=max_results)
                return {
                    "success": True,
                    "query": query,
                    "source": "tavily",
                    "source_type": "live",
                    "data": res,
                    "error": None,
                }
            except Exception as e:
                logger.error(f"Tavily search failure: {e}")
                return {
                    "success": False,
                    "query": query,
                    "source": "tavily",
                    "source_type": "live",
                    "data": None,
                    "error": f"Tavily search failed: {str(e)}",
                }

        # Honest unconfigured indicator (do NOT fabricate fake URLs)
        return {
            "success": False,
            "query": query,
            "source": "web_search_unconfigured",
            "source_type": "unavailable",
            "data": None,
            "error": "Tavily web research API key is not configured.",
        }


async def web_search(query: str, max_results: int = 5) -> Dict[str, Any]:
    """Convenience functional wrapper for web search tool."""
    tool = WebSearchTool()
    return await tool.search(query=query, max_results=max_results)
