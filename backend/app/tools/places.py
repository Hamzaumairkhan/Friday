"""Live places and attractions search tool using OpenStreetMap Nominatim with source transparency."""

from typing import Dict, Any, Optional, List
from datetime import datetime
import httpx

from app.core.logging import get_logger

logger = get_logger("tools.places")

USER_AGENT = "Friday-Travel-Copilot/1.0 (travel@friday.pk)"


class PlacesTool:
    """Places search using OpenStreetMap Nominatim live search."""

    def __init__(self, timeout: float = 6.0):
        self.timeout = timeout

    async def search_places(self, destination: str, query: Optional[str] = None) -> Dict[str, Any]:
        """Search real attractions, viewpoints, and tourist spots with strict live source attribution."""
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
        search_q = query or f"attractions in {dest_clean} Pakistan"

        # 1. Attempt Live OpenStreetMap / Nominatim POI Search
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                url = "https://nominatim.openstreetmap.org/search"
                headers = {"User-Agent": USER_AGENT}
                params = {"q": search_q, "format": "json", "countrycodes": "pk", "limit": 6}
                resp = await client.get(url, params=params, headers=headers)

                if resp.status_code == 200:
                    results_raw = resp.json()
                    if results_raw:
                        places = []
                        for item in results_raw:
                            places.append({
                                "name": item.get("name") or item.get("display_name", "").split(",")[0],
                                "address": item.get("display_name"),
                                "latitude": float(item.get("lat", 0.0)),
                                "longitude": float(item.get("lon", 0.0)),
                                "osm_type": item.get("type"),
                                "osm_class": item.get("class"),
                                "osm_url": f"https://www.openstreetmap.org/{item.get('osm_type', 'node')}/{item.get('osm_id', '')}",
                                "source": "openstreetmap_nominatim",
                                "source_type": "live",
                                "retrieved_at": datetime.utcnow().isoformat(),
                            })
                        if places:
                            return {
                                "success": True,
                                "destination": destination,
                                "count": len(places),
                                "data": places,
                                "source": "openstreetmap_nominatim",
                                "source_type": "live",
                                "error": None,
                            }
        except Exception as e:
            logger.info(f"OpenStreetMap search notice for '{destination}': {e}")

        # 2. Honest unavailable state (No fake/demo attractions fabricated)
        return {
            "success": False,
            "destination": destination,
            "count": 0,
            "data": [],
            "source": "openstreetmap_nominatim",
            "source_type": "unavailable",
            "error": f"No live OpenStreetMap attractions found for destination '{destination}'.",
        }


async def search_places(destination: str, query: Optional[str] = None) -> dict:
    """Search for tourist places and attractions at a destination."""
    tool = PlacesTool()
    res = await tool.search_places(destination=destination, query=query)
    return {
        "success": res["success"],
        "data": {
            "destination": destination,
            "count": len(res.get("data", [])),
            "places": res.get("data", []),
        },
        "source": res["source"],
        "source_type": res["source_type"],
        "retrieved_at": res.get("retrieved_at"),
        "error": res.get("error"),
    }
