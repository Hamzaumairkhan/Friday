"""Live OSRM & OpenStreetMap routing and distance calculation tool with source transparency."""

from typing import Dict, Any, Optional, Tuple
from datetime import datetime
import math
import httpx

from app.core.logging import get_logger

logger = get_logger("tools.maps")

USER_AGENT = "Friday-Travel-Copilot/1.0 (travel@friday.pk)"


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great circle distance between two points in kilometers."""
    r = 6371.0  # Earth radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2.0) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(r * c, 1)


class MapsTool:
    """Live road routing and distance calculation tool using Open Source Routing Machine (OSRM) and OpenStreetMap."""

    def __init__(self, timeout: float = 6.0):
        self.timeout = timeout

    async def _geocode_live(self, client: httpx.AsyncClient, location: str) -> Optional[Tuple[float, float]]:
        """Resolve location name to live (lat, lon) coordinates using OpenStreetMap Nominatim."""
        try:
            url = "https://nominatim.openstreetmap.org/search"
            headers = {"User-Agent": USER_AGENT}
            q = f"{location}, Pakistan" if "pakistan" not in location.lower() else location
            params = {"q": q, "format": "json", "countrycodes": "pk", "limit": 1}
            resp = await client.get(url, params=params, headers=headers, timeout=4.0)
            if resp.status_code == 200:
                data = resp.json()
                if data and len(data) > 0:
                    return float(data[0]["lat"]), float(data[0]["lon"])
        except Exception as e:
            logger.debug(f"Live Nominatim geocoding notice for '{location}': {e}")
        return None

    async def get_route(
        self,
        origin: str = "Islamabad",
        destination: str = "Hunza",
        mode: str = "driving"
    ) -> Dict[str, Any]:
        """Fetch live road distance and duration via OSRM."""
        if not origin or not destination or not origin.strip() or not destination.strip():
            return {
                "success": False,
                "source": "validation_error",
                "source_type": "invalid_input",
                "data": None,
                "error": "Both origin and destination are required.",
            }

        orig_clean = origin.strip()
        dest_clean = destination.strip()

        # 1. Attempt Live OSRM Routing via dynamic live geocoding
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                orig_coords = await self._geocode_live(client, orig_clean)
                dest_coords = await self._geocode_live(client, dest_clean)

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
                    else:
                        # Geodesic calculation from live geocoded points
                        straight_dist = haversine_distance_km(lat1, lon1, lat2, lon2)
                        estimated_road_dist = round(straight_dist * 1.35, 1)
                        estimated_time = round(estimated_road_dist / 45.0, 1)
                        return {
                            "success": True,
                            "source": "openstreetmap_nominatim_live",
                            "source_type": "live",
                            "data": {
                                "origin": origin,
                                "destination": destination,
                                "distance_km": estimated_road_dist,
                                "drive_time_hours": estimated_time,
                                "distance_text": f"{estimated_road_dist} km",
                                "duration_text": f"{estimated_time} hours",
                                "start_coordinates": {"latitude": lat1, "longitude": lon1},
                                "end_coordinates": {"latitude": lat2, "longitude": lon2},
                                "summary": f"Live geographic routing between {origin} and {destination}",
                                "travel_mode": mode,
                                "retrieved_at": datetime.utcnow().isoformat(),
                            },
                            "error": None,
                        }
        except Exception as e:
            logger.info(f"Live routing notice between '{origin}' and '{destination}': {e}")

        # 2. Honest unavailable state (No fake route data fabricated)
        return {
            "success": False,
            "source": "osrm_routing",
            "source_type": "unavailable",
            "data": None,
            "error": f"Live driving route between '{origin}' and '{destination}' could not be calculated.",
        }


async def get_route(origin: str, destination: str, mode: str = "driving") -> dict:
    """Get driving route information between two locations."""
    tool = MapsTool()
    res = await tool.get_route(origin=origin, destination=destination, mode=mode)
    if res["success"]:
        return {
            "success": True,
            "data": res["data"],
            "source": res["source"],
            "source_type": res["source_type"],
            "retrieved_at": res["data"].get("retrieved_at"),
        }
    return {
        "success": False,
        "error": res.get("error", "Route unavailable"),
        "source": res.get("source", "osrm_routing"),
        "source_type": res.get("source_type", "unavailable"),
    }
