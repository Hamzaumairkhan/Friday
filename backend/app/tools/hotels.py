"""Hotels search tool with OpenStreetMap Nominatim lodging search & curated Pakistan hotel database."""

from typing import Optional, Dict, Any, List
from datetime import datetime
import httpx

from app.core.logging import get_logger

logger = get_logger("tools.hotels")

USER_AGENT = "Friday-Travel-Copilot/1.0 (travel@friday.pk)"

CURATED_PAKISTAN_HOTELS = {
    "hunza": [
        {"name": "Serena Inn Hunza", "address": "Karimabad, Hunza", "rating": 4.6, "review_count": 1800, "price_tier": "Luxury (Rs. 25,000-45,000/night)", "types": ["luxury_hotel"]},
        {"name": "Luxus Grand Attabad Lake Resort", "address": "Attabad Lake, Hunza", "rating": 4.8, "review_count": 2100, "price_tier": "Luxury (Rs. 30,000-50,000/night)", "types": ["resort"]},
        {"name": "Hunza Darbar Hotel", "address": "Karimabad, Hunza", "rating": 4.3, "review_count": 1400, "price_tier": "Mid-Range (Rs. 8,000-15,000/night)", "types": ["mid_range_hotel"]},
        {"name": "Old Hunza Inn & Guest House", "address": "Karimabad, Hunza", "rating": 4.2, "review_count": 850, "price_tier": "Budget (Rs. 3,500-6,000/night)", "types": ["budget_stay"]},
    ],
    "skardu": [
        {"name": "Shangrila Resort Skardu", "address": "Lower Kachura, Skardu", "rating": 4.7, "review_count": 2600, "price_tier": "Luxury (Rs. 28,000-45,000/night)", "types": ["luxury_resort"]},
        {"name": "Serena Shigar Fort", "address": "Shigar Valley, Skardu", "rating": 4.8, "review_count": 1900, "price_tier": "Heritage Luxury (Rs. 35,000-60,000/night)", "types": ["heritage_hotel"]},
        {"name": "Tengis Hotel Skardu", "address": "Main Bazar, Skardu", "rating": 4.1, "review_count": 650, "price_tier": "Budget (Rs. 4,000-7,000/night)", "types": ["budget_hotel"]},
    ],
    "swat": [
        {"name": "Serena Swat Hotel", "address": "Saidu Sharif, Swat", "rating": 4.6, "review_count": 3200, "price_tier": "Luxury (Rs. 20,000-35,000/night)", "types": ["luxury_hotel"]},
        {"name": "Rock City Resort", "address": "Fizagat, Swat", "rating": 4.3, "review_count": 1700, "price_tier": "Mid-Range (Rs. 8,000-14,000/night)", "types": ["resort"]},
        {"name": "Green Hills Hotel Kalam", "address": "Kalam Valley, Swat", "rating": 4.2, "review_count": 920, "price_tier": "Budget (Rs. 3,500-6,500/night)", "types": ["mid_range_hotel"]},
    ],
    "murree": [
        {"name": "Pearl Continental Bhurban", "address": "Bhurban, Murree", "rating": 4.6, "review_count": 4500, "price_tier": "Luxury (Rs. 28,000-45,000/night)", "types": ["luxury_resort"]},
        {"name": "Lockwood Hotel Murree", "address": "Mall Road, Murree", "rating": 4.2, "review_count": 1600, "price_tier": "Mid-Range (Rs. 7,000-12,000/night)", "types": ["heritage_hotel"]},
    ],
    "naran": [
        {"name": "Pine Park Hotel & Resort", "address": "Kaghan / Naran", "rating": 4.4, "review_count": 2100, "price_tier": "Mid-Range (Rs. 10,000-18,000/night)", "types": ["resort"]},
        {"name": "Hotel de Manchi Naran", "address": "Main Bazar, Naran", "rating": 4.1, "review_count": 1300, "price_tier": "Budget (Rs. 4,000-7,500/night)", "types": ["hotel"]},
    ],
}


class HotelsTool:
    """Hotel and accommodation search using OpenStreetMap Nominatim lodging search with curated fallback."""

    def __init__(self, timeout: float = 6.0):
        self.timeout = timeout

    async def search_hotels(
        self,
        destination: str,
        budget_tier: Optional[str] = None,
        max_price: Optional[float] = None
    ) -> Dict[str, Any]:
        """Search hotels and guest houses with strict source attribution."""
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

        dest_clean = destination.strip().lower()
        search_q = f"hotels in {destination} Pakistan"

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
            logger.info(f"OpenStreetMap lodging search notice: {e}")

        # 2. Curated Pakistan Hotels Fallback
        known = CURATED_PAKISTAN_HOTELS.get(dest_clean)
        if known:
            results = []
            for item in known:
                results.append({
                    **item,
                    "osm_url": f"https://www.openstreetmap.org/search?query=hotels+in+{destination}",
                    "source": "curated_pakistan_hotels",
                    "source_type": "curated",
                    "pricing_note": "Indicative seasonal price range. Live booking availability requires direct contact.",
                    "retrieved_at": datetime.utcnow().isoformat(),
                })

            return {
                "success": True,
                "destination": destination,
                "count": len(results),
                "data": results,
                "source": "curated_pakistan_hotels",
                "source_type": "curated",
                "notice": "Curated Pakistan hotel knowledge. Prices are estimates and not live quotes.",
                "error": None,
            }

        # 3. Honest unavailable
        return {
            "success": False,
            "destination": destination,
            "count": 0,
            "data": [],
            "source": "openstreetmap_lodging",
            "source_type": "unavailable",
            "error": f"No live lodging provider data and no curated hotel records for unknown destination '{destination}'.",
        }


async def search_hotels(
    destination: str,
    budget_tier: Optional[str] = None,
    max_price: Optional[float] = None
) -> dict:
    """Search for hotels by destination and budget tier."""
    tool = HotelsTool()
    res = await tool.search_hotels(destination=destination, budget_tier=budget_tier, max_price=max_price)
    return {
        "success": res["success"],
        "data": {
            "destination": destination,
            "count": len(res.get("data", [])),
            "hotels": res.get("data", []),
        },
        "source": res.get("source"),
        "source_type": res.get("source_type"),
        "timestamp": datetime.utcnow().isoformat(),
        "error": res.get("error"),
    }
