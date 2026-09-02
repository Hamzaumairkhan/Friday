"""Live restaurants search tool using OpenStreetMap Nominatim dining search with source transparency."""

from typing import Optional, Dict, Any, List
from datetime import datetime
import httpx

from app.core.logging import get_logger

logger = get_logger("tools.restaurants")

USER_AGENT = "Friday-Travel-Copilot/1.0 (travel@friday.pk)"


class RestaurantsTool:
    """Restaurant and local dining search with OpenStreetMap Nominatim live search."""

    def __init__(self, timeout: float = 6.0):
        self.timeout = timeout

    async def search_restaurants(self, destination: str, cuisine: Optional[str] = None) -> Dict[str, Any]:
        """Search restaurants and local eateries with strict live source attribution."""
        if not destination or not destination.strip():
            return {
                "success": False,
                "destination": "",
                "count": 0,
                "data": [],
                "source": "validation_error",
                "source_type": "invalid_input",
                "error": "Destination parameter cannot be empty.",
            }

        dest_clean = destination.strip()
        search_q = f"{cuisine or 'restaurants'} in {dest_clean} Pakistan"

        # 1. Attempt Live OpenStreetMap Dining Search
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                url = "https://nominatim.openstreetmap.org/search"
                headers = {"User-Agent": USER_AGENT}
                params = {"q": search_q, "format": "json", "countrycodes": "pk", "limit": 6}
                resp = await client.get(url, params=params, headers=headers)

                if resp.status_code == 200:
                    results_raw = resp.json()
                    if results_raw:
                        restaurants = []
                        for item in results_raw:
                            restaurants.append({
                                "name": item.get("name") or item.get("display_name", "").split(",")[0],
                                "address": item.get("display_name"),
                                "latitude": float(item.get("lat", 0.0)),
                                "longitude": float(item.get("lon", 0.0)),
                                "osm_type": item.get("type"),
                                "osm_url": f"https://www.openstreetmap.org/{item.get('osm_type', 'node')}/{item.get('osm_id', '')}",
                                "source": "openstreetmap_dining",
                                "source_type": "live",
                                "retrieved_at": datetime.utcnow().isoformat(),
                            })
                        if restaurants:
                            return {
                                "success": True,
                                "destination": destination,
                                "count": len(restaurants),
                                "data": restaurants,
                                "source": "openstreetmap_dining",
                                "source_type": "live",
                                "error": None,
                            }
        except Exception as e:
            logger.info(f"OpenStreetMap restaurant search notice for '{destination}': {e}")

        # 2. Honest unavailable state (No fake/demo restaurants fabricated)
        return {
            "success": False,
            "destination": destination,
            "count": 0,
            "data": [],
            "source": "openstreetmap_dining",
            "source_type": "unavailable",
            "error": f"No live restaurant data found for destination '{destination}'.",
        }


async def search_restaurants(destination: str, cuisine: Optional[str] = None) -> dict:
    """Search for restaurants at a destination."""
    tool = RestaurantsTool()
    res = await tool.search_restaurants(destination=destination, cuisine=cuisine)
    return {
        "success": res["success"],
        "data": {
            "destination": destination,
            "count": len(res.get("data", [])),
            "restaurants": res.get("data", []),
        },
        "source": res["source"],
        "source_type": res["source_type"],
        "retrieved_at": res.get("retrieved_at"),
        "error": res.get("error"),
    }
