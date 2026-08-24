"""Research agent coordinating live tool evidence across Tavily, Google Maps, OpenWeather, and ChromaDB."""

from typing import Dict, Any, List, Optional
from datetime import datetime
import asyncio

from app.tools.weather import WeatherTool
from app.tools.maps import MapsTool
from app.tools.places import PlacesTool
from app.tools.hotels import HotelsTool
from app.tools.restaurants import RestaurantsTool
from app.tools.web_search import WebSearchTool
from app.tools.organizers import OrganizersTool
from app.vector_store.chroma import get_vector_store
from app.vector_store.collections import Collections
from app.core.logging import get_logger

logger = get_logger("agents.research")


class ResearchAgent:
    """Agent that aggregates multi-source evidence for travel planning."""

    def __init__(self):
        self.weather_tool = WeatherTool()
        self.maps_tool = MapsTool()
        self.places_tool = PlacesTool()
        self.hotels_tool = HotelsTool()
        self.restaurants_tool = RestaurantsTool()
        self.web_search_tool = WebSearchTool()
        self.organizers_tool = OrganizersTool()
        self.vector_store = get_vector_store()

    async def gather_destination_intel(
        self,
        destination: str,
        origin: str = "Islamabad",
        duration: int = 4,
        budget_per_person: float = 35000,
    ) -> Dict[str, Any]:
        """Execute parallel live tool queries and assemble structured research evidence."""
        logger.info(f"ResearchAgent gathering live intelligence for {destination} from {origin}...")

        tier = "luxury" if budget_per_person > 60000 else "budget" if budget_per_person < 30000 else "mid_range"

        weather_task = self.weather_tool.get_weather(destination, days=duration)
        maps_task = self.maps_tool.get_route(origin=origin, destination=destination)
        places_task = self.places_tool.search_places(destination=destination)
        hotels_task = self.hotels_tool.search_hotels(destination=destination, budget_tier=tier)
        restaurants_task = self.restaurants_tool.search_restaurants(destination=destination)
        web_task = self.web_search_tool.search(f"Travel advisory road conditions attractions {destination} Pakistan")
        organizers_task = self.organizers_tool.search_organizers(destination=destination)
        chroma_task = self.vector_store.search(
            collection_name=Collections.TRAVEL_KNOWLEDGE,
            query=f"Travel guide highlights {destination}",
            limit=3,
        )

        (
            weather_res,
            maps_res,
            places_res,
            hotels_res,
            restaurants_res,
            web_res,
            organizers_res,
            chroma_res,
        ) = await asyncio.gather(
            weather_task,
            maps_task,
            places_task,
            hotels_task,
            restaurants_task,
            web_task,
            organizers_task,
            chroma_task,
            return_exceptions=True,
        )

        def _safe_data(res, fallback=None):
            if isinstance(res, dict) and res.get("success"):
                return res.get("data", fallback)
            elif isinstance(res, list):
                return res
            return fallback

        evidence_items = []

        # Tavily Evidence
        web_data = _safe_data(web_res, {})
        for res_item in web_data.get("results", []) if isinstance(web_data, dict) else []:
            evidence_items.append({
                "source": "tavily",
                "tool": "web_search",
                "title": res_item.get("title"),
                "source_url": res_item.get("url"),
                "snippet": res_item.get("snippet"),
                "confidence": res_item.get("score", 0.9),
                "retrieved_at": datetime.utcnow().isoformat(),
            })

        # ChromaDB Semantic Evidence
        if isinstance(chroma_res, list):
            for doc in chroma_res:
                evidence_items.append({
                    "source": "chromadb_vector_store",
                    "tool": "rag_knowledge",
                    "title": doc.get("metadata", {}).get("source", f"{destination} Knowledge Document"),
                    "source_url": None,
                    "snippet": doc.get("text"),
                    "confidence": doc.get("score", 0.95),
                    "retrieved_at": datetime.utcnow().isoformat(),
                })

        intel = {
            "destination": destination,
            "origin": origin,
            "weather": _safe_data(weather_res, {}),
            "route": _safe_data(maps_res, {}),
            "places": _safe_data(places_res, []),
            "hotels": _safe_data(hotels_res, []),
            "restaurants": _safe_data(restaurants_res, []),
            "organizers": _safe_data(organizers_res, []),
            "web_search": web_data,
            "evidence": evidence_items,
            "gathered_at": datetime.utcnow().isoformat(),
        }

        logger.info(f"Research gathered with {len(evidence_items)} evidence items for {destination}.")
        return intel
