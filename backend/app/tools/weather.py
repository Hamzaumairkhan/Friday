"""OpenWeather API tool for live weather conditions and multi-day forecasts with explicit source transparency."""

from typing import Dict, Any, Optional
from datetime import datetime
import httpx

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger("tools.weather")
settings = get_settings()

DESTINATION_COORDINATES = {
    "hunza": {"lat": 36.3167, "lon": 74.6500, "name": "Hunza / Karimabad"},
    "skardu": {"lat": 35.2971, "lon": 75.6333, "name": "Skardu"},
    "swat": {"lat": 35.2227, "lon": 72.4258, "name": "Swat / Mingora"},
    "kalam": {"lat": 35.4907, "lon": 72.5859, "name": "Kalam Valley"},
    "naran": {"lat": 34.9085, "lon": 73.6525, "name": "Naran"},
    "gilgit": {"lat": 35.9221, "lon": 74.3087, "name": "Gilgit"},
    "chitral": {"lat": 35.8510, "lon": 71.7864, "name": "Chitral"},
    "murree": {"lat": 33.9070, "lon": 73.3943, "name": "Murree"},
    "islamabad": {"lat": 33.6844, "lon": 73.0479, "name": "Islamabad"},
    "lahore": {"lat": 31.5204, "lon": 74.3587, "name": "Lahore"},
    "karachi": {"lat": 24.8607, "lon": 67.0011, "name": "Karachi"},
}

SEASONAL_KNOWLEDGE = {
    "hunza": {"typical_temp": 18, "condition": "Partly Cloudy", "note": "Pleasant in summer, sub-zero winters"},
    "skardu": {"typical_temp": 16, "condition": "Clear", "note": "High altitude alpine climate"},
    "swat": {"typical_temp": 22, "condition": "Mild", "note": "Temperate valley climate"},
    "naran": {"typical_temp": 14, "condition": "Cool", "note": "Snow cover Oct-May, open June-Sept"},
    "murree": {"typical_temp": 19, "condition": "Pleasant", "note": "Hill station climate with monsoon rains in Jul-Aug"},
}


class WeatherTool:
    """Weather tool retrieving temperature, precipitation, wind, and forecast via OpenWeather with source transparency."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.OPENWEATHER_API_KEY

    async def get_weather(self, destination: str, days: int = 4) -> Dict[str, Any]:
        """Fetch live weather and multi-day forecast from OpenWeather API or return transparent unavailable/curated status."""
        dest_clean = destination.strip().lower()
        coords = DESTINATION_COORDINATES.get(dest_clean)

        if self.api_key:
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    if coords:
                        curr_params = {"lat": coords["lat"], "lon": coords["lon"], "units": "metric", "appid": self.api_key}
                        fore_params = {"lat": coords["lat"], "lon": coords["lon"], "units": "metric", "appid": self.api_key}
                    else:
                        curr_params = {"q": f"{destination},PK", "units": "metric", "appid": self.api_key}
                        fore_params = {"q": f"{destination},PK", "units": "metric", "appid": self.api_key}

                    curr_url = "https://api.openweathermap.org/data/2.5/weather"
                    curr_resp = await client.get(curr_url, params=curr_params)

                    if curr_resp.status_code == 200:
                        curr_data = curr_resp.json()
                        main = curr_data.get("main", {})
                        weather_arr = curr_data.get("weather", [{}])
                        wind = curr_data.get("wind", {})

                        # 5-Day Forecast
                        fore_url = "https://api.openweathermap.org/data/2.5/forecast"
                        fore_resp = await client.get(fore_url, params=fore_params)

                        forecast = []
                        if fore_resp.status_code == 200:
                            fore_data = fore_resp.json()
                            for item in fore_data.get("list", [])[:days * 8:8]:
                                forecast.append({
                                    "date": item.get("dt_txt", "").split(" ")[0],
                                    "temp_max": round(item.get("main", {}).get("temp_max", 20)),
                                    "temp_min": round(item.get("main", {}).get("temp_min", 10)),
                                    "condition": item.get("weather", [{}])[0].get("main", "Clear"),
                                    "description": item.get("weather", [{}])[0].get("description", ""),
                                    "pop": round(item.get("pop", 0.0) * 100),
                                })

                        return {
                            "success": True,
                            "source": "openweather_api",
                            "source_type": "live",
                            "data": {
                                "destination": coords["name"] if coords else destination,
                                "current_temp": round(main.get("temp", 20)),
                                "feels_like": round(main.get("feels_like", 20)),
                                "condition": weather_arr[0].get("main", "Clear"),
                                "description": weather_arr[0].get("description", "Clear sky"),
                                "humidity": main.get("humidity", 50),
                                "precipitation_chance": curr_data.get("clouds", {}).get("all", 10),
                                "wind_speed_kmh": round(wind.get("speed", 3.0) * 3.6),
                                "forecast": forecast,
                                "retrieved_at": datetime.utcnow().isoformat(),
                            },
                            "error": None,
                        }
                    else:
                        logger.warning(f"OpenWeather API returned HTTP {curr_resp.status_code}: {curr_resp.text}")
                        # If API key invalid or rate limited, return clear failure without fabricating
                        return {
                            "success": False,
                            "source": "openweather_api",
                            "source_type": "live",
                            "data": None,
                            "error": f"OpenWeather HTTP {curr_resp.status_code}: {curr_resp.text}",
                        }
            except Exception as e:
                logger.error(f"OpenWeather request error: {e}")
                return {
                    "success": False,
                    "source": "openweather_api",
                    "source_type": "live",
                    "data": None,
                    "error": f"OpenWeather network error: {str(e)}",
                }

        # Explicit seasonal knowledge fallback (never claim to be live weather)
        seasonal = SEASONAL_KNOWLEDGE.get(dest_clean)
        if seasonal:
            return {
                "success": True,
                "source": "pakistan_seasonal_climate_knowledge",
                "source_type": "curated_seasonal",
                "data": {
                    "destination": destination,
                    "typical_temp": seasonal["typical_temp"],
                    "condition": seasonal["condition"],
                    "climate_note": seasonal["note"],
                    "is_live": False,
                    "notice": "Live OpenWeather key not configured. Using static seasonal climate reference.",
                    "retrieved_at": datetime.utcnow().isoformat(),
                },
                "error": None,
            }

        return {
            "success": False,
            "source": "openweather_api",
            "source_type": "unavailable",
            "data": None,
            "error": "OpenWeather API key is not configured and no seasonal climate data exists for this destination.",
        }


async def get_weather(destination: str, days: int = 4) -> Dict[str, Any]:
    """Convenience functional wrapper for weather tool."""
    tool = WeatherTool()
    return await tool.get_weather(destination=destination, days=days)
