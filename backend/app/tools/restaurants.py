"""Restaurants search tool with OpenStreetMap Nominatim dining search & curated Pakistan culinary database."""

from typing import Optional, Dict, Any, List
from datetime import datetime
import httpx

from app.core.logging import get_logger

logger = get_logger("tools.restaurants")

USER_AGENT = "Friday-Travel-Copilot/1.0 (travel@friday.pk)"

CURATED_PAKISTAN_RESTAURANTS = {
    "hunza": [
        {"name": "Cafe de Hunza", "address": "Karimabad, Hunza", "rating": 4.6, "review_count": 2100, "price_tier": "Rs. 800-1,500/person", "specialties": ["Walnut Cake", "Espresso", "Hunza Herbal Tea"], "types": ["cafe", "bakery"]},
        {"name": "Yak Grill Passu", "address": "Passu, Gojal, Hunza", "rating": 4.8, "review_count": 1600, "price_tier": "Rs. 1,500-2,500/person", "specialties": ["Yak Burger", "Yak Steak", "Local Soup"], "types": ["restaurant", "barbecue"]},
        {"name": "Hidden Paradise Hunza Traditional Food", "address": "Karimabad, Hunza", "rating": 4.5, "review_count": 1300, "price_tier": "Rs. 1,000-1,800/person", "specialties": ["Chapshuro", "Dawdo Soup", "Gyal"], "types": ["traditional_restaurant"]},
    ],
    "skardu": [
        {"name": "Dewan-e-Khas Restaurant", "address": "Main Bazar, Skardu", "rating": 4.4, "review_count": 1500, "price_tier": "Rs. 1,000-1,800/person", "specialties": ["Balti Trout Fish", "Mutton Karahi", "Mamtu"], "types": ["restaurant", "traditional"]},
        {"name": "Shangrila Pagoda Dining Hall", "address": "Lower Kachura, Skardu", "rating": 4.7, "review_count": 1900, "price_tier": "Rs. 2,000-3,500/person", "specialties": ["Continental", "Desi BBQ", "Fresh Trout"], "types": ["fine_dining"]},
    ],
    "swat": [
        {"name": "Swat Fish Corner", "address": "Fizagat, Swat", "rating": 4.5, "review_count": 2400, "price_tier": "Rs. 1,200-2,000/person", "specialties": ["Deep Fried Trout", "Grilled Fish", "Naan"], "types": ["seafood_restaurant"]},
        {"name": "Kalam Continental Dining", "address": "Main Bazar, Kalam, Swat", "rating": 4.2, "review_count": 890, "price_tier": "Rs. 800-1,500/person", "specialties": ["Chicken Handi", "Mutton Shinwari", "Chappal Kabab"], "types": ["pakistani_restaurant"]},
    ],
    "murree": [
        {"name": "Charsi Tikka Murree", "address": "Mall Road, Murree", "rating": 4.3, "review_count": 3100, "price_tier": "Rs. 1,200-2,000/person", "specialties": ["Dumba Karahi", "Peshawari Tikka"], "types": ["barbecue_restaurant"]},
    ],
    "naran": [
        {"name": "Moon Restaurant Naran", "address": "Main Bazar, Naran", "rating": 4.3, "review_count": 2800, "price_tier": "Rs. 1,000-1,800/person", "specialties": ["Kaghan Trout Fish", "Chicken Karahi"], "types": ["pakistani_restaurant"]},
    ],
}


class RestaurantsTool:
    """Restaurant and local dining search with OpenStreetMap Nominatim dining search and curated Pakistan dining database."""

    def __init__(self, timeout: float = 6.0):
        self.timeout = timeout

    async def search_restaurants(self, destination: str, cuisine: Optional[str] = None) -> Dict[str, Any]:
        """Search restaurants and local eateries with strict source attribution."""
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
        search_q = f"{cuisine or 'restaurants'} in {destination} Pakistan"

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
            logger.info(f"OpenStreetMap restaurant search notice: {e}")

        # 2. Curated Pakistan Dining Fallback
        known = CURATED_PAKISTAN_RESTAURANTS.get(dest_clean)
        if known:
            results = []
            for item in known:
                results.append({
                    **item,
                    "osm_url": f"https://www.openstreetmap.org/search?query=restaurants+in+{destination}",
                    "source": "curated_pakistan_restaurants",
                    "source_type": "curated",
                    "retrieved_at": datetime.utcnow().isoformat(),
                })

            return {
                "success": True,
                "destination": destination,
                "count": len(results),
                "data": results,
                "source": "curated_pakistan_restaurants",
                "source_type": "curated",
                "notice": "Curated Pakistan culinary recommendations.",
                "error": None,
            }

        # 3. Honest unavailable
        return {
            "success": False,
            "destination": destination,
            "count": 0,
            "data": [],
            "source": "openstreetmap_dining",
            "source_type": "unavailable",
            "error": f"No live restaurant data and no curated dining records for unknown destination '{destination}'.",
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
        "source": res.get("source"),
        "source_type": res.get("source_type"),
        "timestamp": datetime.utcnow().isoformat(),
        "error": res.get("error"),
    }
