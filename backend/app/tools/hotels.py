"""Live hotels search tool using OpenStreetMap Nominatim lodging search and live research with source transparency."""

from typing import Optional, Dict, Any, List
from datetime import datetime
import httpx

from app.core.logging import get_logger

logger = get_logger("tools.hotels")

USER_AGENT = "Friday-Travel-Copilot/1.0 (travel@friday.pk)"


class HotelsTool:
    """Hotel and accommodation search using OpenStreetMap Nominatim live lodging search."""

    def __init__(self, timeout: float = 6.0):
        self.timeout = timeout

    async def search_hotels(
        self,
        destination: str,
        budget_tier: Optional[str] = None,
        max_price: Optional[float] = None
    ) -> Dict[str, Any]:
        """Search hotels and guest houses with strict live source attribution."""
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
        search_q = f"hotels in {dest_clean} Pakistan"

        # 1. Attempt Live OpenStreetMap Lodging Search
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                url = "https://nominatim.openstreetmap.org/search"
                headers = {"User-Agent": USER_AGENT}
                params = {"q": search_q, "format": "json", "countrycodes": "pk", "limit": 6}
                resp = await client.get(url, params=params, headers=headers)

                if resp.status_code == 200:
                    results_raw = resp.json()
                    if results_raw:
                        hotels = []
                        for item in results_raw:
                            hotels.append({
                                "name": item.get("name") or item.get("display_name", "").split(",")[0],
                                "address": item.get("display_name"),
                                "latitude": float(item.get("lat", 0.0)),
                                "longitude": float(item.get("lon", 0.0)),
                                "osm_type": item.get("type"),
                                "osm_url": f"https://www.openstreetmap.org/{item.get('osm_type', 'node')}/{item.get('osm_id', '')}",
                                "source": "openstreetmap_lodging",
                                "source_type": "live",
                                "live_availability": False,
                                "retrieved_at": datetime.utcnow().isoformat(),
                            })
                        if hotels:
                            return {
                                "success": True,
                                "destination": destination,
                                "count": len(hotels),
                                "data": hotels,
                                "source": "openstreetmap_lodging",
                                "source_type": "live",
                                "error": None,
                            }
        except Exception as e:
            logger.info(f"OpenStreetMap lodging search notice for '{destination}': {e}")

        # 2. Honest unavailable state (No fake/demo hotels fabricated)
        return {
            "success": False,
            "destination": destination,
            "count": 0,
            "data": [],
            "source": "openstreetmap_lodging",
            "source_type": "unavailable",
            "error": f"No live lodging provider data found for destination '{destination}'.",
        }


async def search_hotels(
    destination: str,
    budget_tier: Optional[str] = None,
    max_price: Optional[float] = None
) -> dict:
    """Search for hotels at a destination."""
    tool = HotelsTool()
    res = await tool.search_hotels(destination=destination, budget_tier=budget_tier, max_price=max_price)
    return {
        "success": res["success"],
        "data": {
            "destination": destination,
            "count": len(res.get("data", [])),
            "hotels": res.get("data", []),
        },
        "source": res["source"],
        "source_type": res["source_type"],
        "retrieved_at": res.get("retrieved_at"),
        "error": res.get("error"),
    }
