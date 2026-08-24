"""OpenStreetMap & Nominatim Places API tool with source transparency and curated Pakistan attractions."""

from typing import Dict, Any, Optional, List
from datetime import datetime
import httpx

from app.core.logging import get_logger

logger = get_logger("tools.places")

USER_AGENT = "Friday-Travel-Copilot/1.0 (travel@friday.pk)"

CURATED_PAKISTAN_ATTRACTIONS = {
    "hunza": [
        {"name": "Baltit Fort", "address": "Karimabad, Hunza, Gilgit-Baltistan", "rating": 4.7, "review_count": 3200, "types": ["tourist_attraction", "historical_landmark"]},
        {"name": "Attabad Lake", "address": "Gojal, Hunza, Gilgit-Baltistan", "rating": 4.8, "review_count": 5100, "types": ["natural_feature", "lake"]},
        {"name": "Passu Cones", "address": "Passu, Gojal, Hunza", "rating": 4.9, "review_count": 2800, "types": ["natural_feature", "mountain"]},
        {"name": "Altit Fort", "address": "Altit, Hunza, Gilgit-Baltistan", "rating": 4.6, "review_count": 2100, "types": ["historical_landmark", "museum"]},
        {"name": "Eagle's Nest Viewpoint", "address": "Duikar, Hunza", "rating": 4.8, "review_count": 1900, "types": ["viewpoint", "scenic_point"]},
    ],
    "skardu": [
        {"name": "Shangrila Resort (Lower Kachura Lake)", "address": "Skardu, Gilgit-Baltistan", "rating": 4.7, "review_count": 4200, "types": ["resort", "lake"]},
        {"name": "Deosai National Park", "address": "Deosai Plains, Skardu", "rating": 4.9, "review_count": 3100, "types": ["natural_feature", "park"]},
        {"name": "Katpana Cold Desert", "address": "Katpana, Skardu", "rating": 4.6, "review_count": 2500, "types": ["natural_feature", "desert"]},
        {"name": "Upper Kachura Lake", "address": "Kachura, Skardu", "rating": 4.8, "review_count": 1800, "types": ["lake", "natural_feature"]},
    ],
    "swat": [
        {"name": "Malam Jabba Ski Resort", "address": "Malam Jabba, Swat, KP", "rating": 4.5, "review_count": 4600, "types": ["ski_resort", "tourist_attraction"]},
        {"name": "Mahodand Lake", "address": "Ushu Valley, Kalam, Swat", "rating": 4.8, "review_count": 3900, "types": ["lake", "natural_feature"]},
        {"name": "White Palace Marghazar", "address": "Marghazar, Swat", "rating": 4.4, "review_count": 2200, "types": ["historical_palace", "museum"]},
    ],
    "murree": [
        {"name": "Mall Road Murree", "address": "Murree, Punjab", "rating": 4.3, "review_count": 5500, "types": ["shopping", "tourist_attraction"]},
        {"name": "Patriata Chairlift (New Murree)", "address": "Patriata, Murree", "rating": 4.5, "review_count": 4100, "types": ["viewpoint", "chairlift"]},
        {"name": "Ayubia National Park & Pipeline Track", "address": "Ayubia, Galyat", "rating": 4.7, "review_count": 3800, "types": ["nature_reserve", "hiking"]},
    ],
    "naran": [
        {"name": "Saif-ul-Malook Lake", "address": "Naran Valley, KP", "rating": 4.8, "review_count": 6200, "types": ["lake", "natural_feature"]},
        {"name": "Babusar Top", "address": "Naran-Chilas Road", "rating": 4.7, "review_count": 4800, "types": ["mountain_pass", "viewpoint"]},
        {"name": "Lulusar Lake", "address": "Kaghan Valley, KP", "rating": 4.6, "review_count": 2900, "types": ["lake", "scenic_point"]},
    ],
}


class PlacesTool:
    """Places search using OpenStreetMap Nominatim with transparent fallback to curated Pakistan POIs."""

    def __init__(self, timeout: float = 6.0):
        self.timeout = timeout

    async def search_places(self, destination: str, query: Optional[str] = None) -> Dict[str, Any]:
        """Search real attractions, viewpoints, and tourist spots with strict source attribution."""
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
        search_q = query or f"attractions in {destination} Pakistan"

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
            logger.info(f"OpenStreetMap search notice ({e}). Checking curated attractions.")

        # 2. Curated Pakistan POIs Fallback
        known = CURATED_PAKISTAN_ATTRACTIONS.get(dest_clean)
        if known:
            results = []
            for item in known:
                results.append({
                    **item,
                    "osm_url": f"https://www.openstreetmap.org/search?query={destination}+{item['name']}",
                    "source": "curated_pakistan_pois",
                    "source_type": "curated",
                    "retrieved_at": datetime.utcnow().isoformat(),
                })

            return {
                "success": True,
                "destination": destination,
                "count": len(results),
                "data": results,
                "source": "curated_pakistan_pois",
                "source_type": "curated",
                "notice": "Curated static points of interest for Pakistan travel destinations.",
                "error": None,
            }

        # 3. Honest unavailable
        return {
            "success": False,
            "destination": destination,
            "count": 0,
            "data": [],
            "source": "openstreetmap_nominatim",
            "source_type": "unavailable",
            "error": f"No live OpenStreetMap data and no curated POIs available for unknown destination '{destination}'.",
        }


async def search_places(destination: str, category: Optional[str] = None) -> dict:
    """Convenience functional wrapper for places tool."""
    tool = PlacesTool()
    res = await tool.search_places(destination=destination, query=f"{category} in {destination}" if category else None)
    return {
        "success": res["success"],
        "data": {
            "destination": destination,
            "places_count": len(res.get("data", [])),
            "places": res.get("data", []),
        },
        "source": res.get("source"),
        "source_type": res.get("source_type"),
        "timestamp": datetime.utcnow().isoformat(),
        "error": res.get("error"),
    }
