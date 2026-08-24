"""OSRM & OpenStreetMap Directions routing tool with source transparency and curated Pakistan highway routes."""

from typing import Dict, Any, Optional, Tuple
from datetime import datetime
import httpx

from app.core.logging import get_logger

logger = get_logger("tools.maps")

USER_AGENT = "Friday-Travel-Copilot/1.0 (travel@friday.pk)"

# Known coordinates for fast deterministic geocoding in Pakistan
PAKISTAN_KNOWN_COORDS = {
    "islamabad": (33.6844, 73.0479),
    "rawalpindi": (33.5651, 73.0169),
    "lahore": (31.5204, 74.3587),
    "karachi": (24.8607, 67.0011),
    "peshawar": (34.0151, 71.5249),
    "hunza": (36.3167, 74.6500),
    "karimabad": (36.3268, 74.6644),
    "skardu": (35.2971, 75.6333),
    "swat": (35.2227, 72.4258),
    "mingora": (34.7758, 72.3626),
    "kalam": (35.4907, 72.5859),
    "malam jabba": (34.7994, 72.5714),
    "naran": (34.9085, 73.6525),
    "kaghan": (34.7738, 73.5273),
    "murree": (33.9070, 73.3943),
    "gilgit": (35.9221, 74.3087),
    "chitral": (35.8510, 71.7864),
    "abbottabad": (34.1688, 73.2215),
}

CURATED_PAKISTAN_ROUTES = {
    ("islamabad", "hunza"): {"distance_km": 598.0, "drive_time_hours": 12.5, "summary": "via Karakoram Highway / N-35"},
    ("islamabad", "skardu"): {"distance_km": 635.0, "drive_time_hours": 14.0, "summary": "via Jaglot-Skardu Road / S-1"},
    ("islamabad", "swat"): {"distance_km": 245.0, "drive_time_hours": 4.5, "summary": "via Swat Motorway / M-16"},
    ("islamabad", "kalam"): {"distance_km": 340.0, "drive_time_hours": 7.0, "summary": "via M-16 & Bahrain-Kalam Road"},
    ("islamabad", "naran"): {"distance_km": 275.0, "drive_time_hours": 6.5, "summary": "via Hazara Motorway & N-15"},
    ("islamabad", "murree"): {"distance_km": 65.0, "drive_time_hours": 1.5, "summary": "via Islamabad-Murree Expressway / N-75"},
    ("islamabad", "lahore"): {"distance_km": 375.0, "drive_time_hours": 4.0, "summary": "via Lahore-Islamabad Motorway / M-2"},
    ("lahore", "islamabad"): {"distance_km": 375.0, "drive_time_hours": 4.0, "summary": "via M-2 Motorway"},
    ("rawalpindi", "hunza"): {"distance_km": 605.0, "drive_time_hours": 12.5, "summary": "via N-35 Karakoram Highway"},
}


class MapsTool:
    """Live road routing and distance calculation tool using Open Source Routing Machine (OSRM) and OpenStreetMap."""

    def __init__(self, timeout: float = 6.0):
        self.timeout = timeout

    async def _geocode(self, client: httpx.AsyncClient, location: str) -> Optional[Tuple[float, float]]:
        """Resolve location name to (lat, lon) coordinates using cache or Nominatim."""
        clean_loc = location.strip().lower()
        if clean_loc in PAKISTAN_KNOWN_COORDS:
            return PAKISTAN_KNOWN_COORDS[clean_loc]

        try:
            url = "https://nominatim.openstreetmap.org/search"
            headers = {"User-Agent": USER_AGENT}
            params = {"q": f"{location}, Pakistan", "format": "json", "countrycodes": "pk", "limit": 1}
            resp = await client.get(url, params=params, headers=headers, timeout=4.0)
            if resp.status_code == 200:
                data = resp.json()
                if data:
                    return float(data[0]["lat"]), float(data[0]["lon"])
        except Exception as e:
            logger.debug(f"Nominatim geocoding notice for '{location}': {e}")
        return None

    async def get_route(
        self,
        origin: str = "Islamabad",
        destination: str = "Hunza",
        mode: str = "driving"
    ) -> Dict[str, Any]:
        """Fetch live road distance and duration via OSRM with graceful curated fallback."""
        if not origin or not destination or not origin.strip() or not destination.strip():
            return {
                "success": False,
                "source": "validation_error",
                "source_type": "invalid_input",
                "data": None,
                "error": "Both origin and destination are required.",
            }

        orig_clean = origin.strip().lower()
        dest_clean = destination.strip().lower()

        # 1. Attempt Live OSRM Routing
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                orig_coords = await self._geocode(client, origin)
                dest_coords = await self._geocode(client, destination)

                if orig_coords and dest_coords:
                    lat1, lon1 = orig_coords
                    lat2, lon2 = dest_coords
                    # OSRM expects coordinates as: lon,lat;lon,lat
                    osrm_url = f"https://router.project-osrm.org/route/v1/driving/{lon1},{lat1};{lon2},{lat2}?overview=false"
                    headers = {"User-Agent": USER_AGENT}
                    resp = await client.get(osrm_url, headers=headers)

                    if resp.status_code == 200:
                        data = resp.json()
                        if data.get("code") == "Ok" and data.get("routes"):
                            route = data["routes"][0]
                            dist_km = round(route["distance"] / 1000.0, 1)
                            dur_hrs = round(route["duration"] / 3600.0, 1)

                            return {
                                "success": True,
                                "source": "osrm_routing",
                                "source_type": "live",
                                "data": {
                                    "origin": origin,
                                    "destination": destination,
                                    "distance_km": dist_km,
                                    "drive_time_hours": dur_hrs,
                                    "distance_text": f"{dist_km} km",
                                    "duration_text": f"{dur_hrs} hours",
                                    "start_coordinates": {"latitude": lat1, "longitude": lon1},
                                    "end_coordinates": {"latitude": lat2, "longitude": lon2},
                                    "summary": f"Live OSRM driving route between {origin} and {destination}",
                                    "travel_mode": mode,
                                    "retrieved_at": datetime.utcnow().isoformat(),
                                },
                                "error": None,
                            }
        except Exception as e:
            logger.info(f"OSRM live routing notice ({e}). Checking curated Pakistan routes.")

        # 2. Curated Pakistan Highway Routes Fallback
        route_info = CURATED_PAKISTAN_ROUTES.get((orig_clean, dest_clean)) or CURATED_PAKISTAN_ROUTES.get((dest_clean, orig_clean))
        if route_info:
            dist_km = route_info["distance_km"]
            time_hrs = route_info["drive_time_hours"]
            return {
                "success": True,
                "source": "curated_pakistan_routes",
                "source_type": "curated",
                "data": {
                    "origin": origin,
                    "destination": destination,
                    "distance_km": dist_km,
                    "drive_time_hours": time_hrs,
                    "distance_text": f"{dist_km} km",
                    "duration_text": f"{time_hrs} hours",
                    "summary": route_info["summary"],
                    "travel_mode": mode,
                    "is_live": False,
                    "notice": "Curated Pakistan highway route knowledge.",
                    "retrieved_at": datetime.utcnow().isoformat(),
                },
                "error": None,
            }

        # 3. Honest unavailable
        return {
            "success": False,
            "source": "osrm_routing",
            "source_type": "unavailable",
            "data": None,
            "error": f"No live OSRM routing data and no curated route found between '{origin}' and '{destination}'.",
        }


async def get_route(origin: str = "Islamabad", destination: str = "Hunza") -> Dict[str, Any]:
    """Convenience functional wrapper for maps tool."""
    tool = MapsTool()
    return await tool.get_route(origin=origin, destination=destination)
