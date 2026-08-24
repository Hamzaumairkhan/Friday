"""Research service orchestrating weather, places, hotels, routes, and vector context."""

from typing import Dict, Any, Optional
from app.tools.weather import get_weather
from app.tools.maps import get_route
from app.tools.places import search_places
from app.tools.hotels import search_hotels
from app.tools.restaurants import search_restaurants
from app.tools.web_search import web_search
from app.vector_store.chroma import get_vector_store
from app.vector_store.collections import Collections
from app.core.logging import get_logger

logger = get_logger("services.research")


class ResearchService:
    """Aggregates tool calls and semantic vector memory into a unified research bundle."""

    @classmethod
    async def gather_destination_research(
        cls,
        destination: str,
        origin: str = "Islamabad",
        budget_tier: Optional[str] = None,
    ) -> Dict[str, Any]:
        logger.info(f"Gathering research for {destination} from {origin}")

        weather_res = await get_weather(destination)
        route_res = await get_route(origin, destination)
        places_res = await search_places(destination)
        hotels_res = await search_hotels(destination, budget_tier=budget_tier)
        restaurants_res = await search_restaurants(destination)
        web_res = await web_search(f"{destination} travel tips and attractions")

        # Query vector store for curated destination knowledge
        vector_store = get_vector_store()
        kb_docs = await vector_store.search(
            collection_name=Collections.TRAVEL_KNOWLEDGE,
            query=f"Destination guide for {destination}",
            limit=3,
        )

        return {
            "destination": destination,
            "origin": origin,
            "weather": weather_res.get("data", {}),
            "route": route_res.get("data", {}),
            "attractions": places_res.get("data", {}).get("places", []),
            "hotels": hotels_res.get("data", {}).get("hotels", []),
            "restaurants": restaurants_res.get("data", {}).get("restaurants", []),
            "web_snippets": web_res.get("data", {}).get("results", []),
            "knowledge_base": [doc["text"] for doc in kb_docs],
        }
