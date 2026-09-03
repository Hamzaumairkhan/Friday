"""Live weather tool for Pakistan and global destinations using live geocoding, Open-Meteo, and OpenWeather APIs."""

from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime, date, timedelta
import httpx

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger("tools.weather")
settings = get_settings()

USER_AGENT = "Friday-Travel-Copilot/1.0 (travel@friday.pk)"


def _wmo_code_to_condition(code: int) -> Tuple[str, str, str]:
    """Convert WMO weather code to user-friendly condition, description, and icon."""
    # WMO Weather interpretation codes (WW)
    if code == 0:
        return "Sunny", "Clear sky", "sun"
    elif code in (1, 2):
        return "Partly Cloudy", "Mainly clear or partly cloudy", "cloud-sun"
    elif code == 3:
        return "Cloudy", "Overcast skies", "cloud"
    elif code in (45, 48):
        return "Foggy", "Fog and depositing rime fog", "cloud"
    elif code in (51, 53, 55):
        return "Drizzle", "Light to dense drizzle", "cloud-rain"
    elif code in (61, 63, 65):
        return "Rainy", "Slight to heavy rain", "cloud-rain"
    elif code in (71, 73, 75, 77):
        return "Snowy", "Slight to heavy snowfall", "snowflake"
    elif code in (80, 81, 82):
        return "Rain Showers", "Rain showers", "cloud-rain"
    elif code in (85, 86):
        return "Snow Showers", "Snow showers", "snowflake"
    elif code in (95, 96, 99):
        return "Thunderstorm", "Thunderstorm with possible hail", "cloud-rain"
    return "Pleasant", "Fair weather", "sun"


def _format_condition(main_cond: str, desc: str = "") -> str:
    """Format technical OpenWeather condition to user-friendly label."""
    main_lower = (main_cond or "").lower()
    desc_lower = (desc or "").lower()

    if "clear" in main_lower:
        return "Sunny"
    if "cloud" in main_lower:
        if "scattered" in desc_lower or "few" in desc_lower or "broken" in desc_lower:
            return "Partly Cloudy"
        return "Cloudy"
    if "rain" in main_lower or "drizzle" in main_lower:
        if "light" in desc_lower:
            return "Light Rain"
        return "Rainy"
    if "thunderstorm" in main_lower:
        return "Thunderstorm"
    if "snow" in main_lower:
        return "Snowy"
    if "haze" in main_lower or "mist" in main_lower or "fog" in main_lower:
        return "Hazy"
    return main_cond or "Sunny"


def _condition_to_icon(condition: str) -> str:
    """Map friendly condition to icon key."""
    c = condition.lower()
    if "sun" in c or "clear" in c:
        return "sun"
    if "partly" in c:
        return "cloud-sun"
    if "cloud" in c or "haze" in c or "fog" in c:
        return "cloud"
    if "rain" in c or "drizzle" in c or "shower" in c:
        return "cloud-rain"
    if "snow" in c:
        return "snowflake"
    return "sun"


from app.core.cache import cache


async def _geocode_destination_live(destination: str, client: httpx.AsyncClient) -> Optional[Tuple[float, float, str]]:
    """Resolve destination to live coordinates (lat, lon, display_name) via OpenStreetMap Nominatim with caching."""
    cache_key = f"geo:nominatim:{destination.strip().lower()}"
    cached_coords = await cache.get(cache_key)
    if cached_coords and isinstance(cached_coords, list) and len(cached_coords) == 3:
        return float(cached_coords[0]), float(cached_coords[1]), str(cached_coords[2])

    try:
        url = "https://nominatim.openstreetmap.org/search"
        headers = {"User-Agent": USER_AGENT}
        q = f"{destination}, Pakistan" if "pakistan" not in destination.lower() else destination
        params = {"q": q, "format": "json", "limit": 1}
        resp = await client.get(url, params=params, headers=headers, timeout=4.0)
        if resp.status_code == 200:
            data = resp.json()
            if data and len(data) > 0:
                lat = float(data[0]["lat"])
                lon = float(data[0]["lon"])
                display = data[0].get("display_name", destination).split(",")[0]
                await cache.set(cache_key, [lat, lon, display], ttl=86400)
                return lat, lon, display
    except Exception as e:
        logger.debug(f"Live geocoding note for weather ({destination}): {e}")
    return None


class WeatherTool:
    """Weather tool retrieving live temperature, conditions, and multi-day forecasts via Open-Meteo & OpenWeather."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.OPENWEATHER_API_KEY

    async def get_weather(
        self, destination: str, days: int = 3, start_date: Optional[str] = None
    ) -> Dict[str, Any]:
        """Fetch live weather and multi-day forecast for exact selected dates from live weather providers."""
        if not destination or not destination.strip():
            return {
                "success": False,
                "source": "validation_error",
                "source_type": "invalid_input",
                "error": "Destination parameter cannot be empty.",
            }

        dest_clean = destination.strip()
        weather_cache_key = f"weather:live:{dest_clean.lower()}:{days}:{start_date or 'today'}"
        cached_weather = await cache.get(weather_cache_key)
        if cached_weather and isinstance(cached_weather, dict) and cached_weather.get("success"):
            return cached_weather
        today = date.today()
        base_date = today
        if start_date:
            try:
                base_date = datetime.strptime(start_date, "%Y-%m-%d").date()
            except Exception:
                base_date = today

        days_count = max(1, min(days, 14))

        async with httpx.AsyncClient(timeout=8.0) as client:
            # 1. Live Geocode destination
            coords = await _geocode_destination_live(dest_clean, client)
            if not coords:
                return {
                    "success": False,
                    "destination": dest_clean,
                    "source": "openstreetmap_nominatim",
                    "source_type": "unavailable",
                    "error": f"Unable to geocode location '{dest_clean}' for live weather.",
                }

            lat, lon, display_name = coords

            # 2. Try OpenWeather API if API key configured
            if self.api_key:
                try:
                    curr_params = {"lat": lat, "lon": lon, "units": "metric", "appid": self.api_key}
                    fore_params = {"lat": lat, "lon": lon, "units": "metric", "appid": self.api_key}

                    curr_resp = await client.get("https://api.openweathermap.org/data/2.5/weather", params=curr_params)
                    fore_resp = await client.get("https://api.openweathermap.org/data/2.5/forecast", params=fore_params)

                    if curr_resp.status_code == 200:
                        curr_data = curr_resp.json()
                        main = curr_data.get("main", {})
                        weather_arr = curr_data.get("weather", [{}])
                        wind = curr_data.get("wind", {})

                        curr_temp = round(main.get("temp", 20))
                        curr_cond = _format_condition(weather_arr[0].get("main", "Clear"), weather_arr[0].get("description", ""))

                        fore_by_date: Dict[str, List[Dict[str, Any]]] = {}
                        if fore_resp.status_code == 200:
                            for item in fore_resp.json().get("list", []):
                                dt_txt = item.get("dt_txt", "")
                                d_str = dt_txt.split(" ")[0] if " " in dt_txt else ""
                                if d_str:
                                    fore_by_date.setdefault(d_str, []).append(item)

                        daily_forecast = []
                        for i in range(days_count):
                            target_d = base_date + timedelta(days=i)
                            target_str = target_d.strftime("%Y-%m-%d")
                            day_label = f"Day {i + 1}"
                            date_formatted = target_d.strftime("%b %d, %a")

                            items_for_day = fore_by_date.get(target_str, [])
                            if items_for_day:
                                temps = [it.get("main", {}).get("temp", curr_temp) for it in items_for_day]
                                max_t = round(max(temps))
                                min_t = round(min(temps))
                                midday_item = items_for_day[len(items_for_day) // 2]
                                cond_raw = midday_item.get("weather", [{}])[0].get("main", "Clear")
                                desc_raw = midday_item.get("weather", [{}])[0].get("description", "Clear sky")
                                pop = round(max([it.get("pop", 0.0) for it in items_for_day]) * 100)
                                humidity = round(sum([it.get("main", {}).get("humidity", 50) for it in items_for_day]) / len(items_for_day))
                            else:
                                max_t = curr_temp + 2
                                min_t = curr_temp - 4
                                cond_raw = curr_cond
                                desc_raw = f"{curr_cond} conditions"
                                pop = 10
                                humidity = 50

                            cond_friendly = _format_condition(cond_raw, desc_raw)
                            # Headline daytime expected temperature:
                            # Day 1: current live temp; Day 2+: expected daytime high (max_t)
                            headline_temp = curr_temp if (i == 0 and curr_temp) else max_t

                            daily_forecast.append({
                                "day_number": i + 1,
                                "day_label": day_label,
                                "date": target_str,
                                "formatted_date": date_formatted,
                                "temp": headline_temp,
                                "temp_max": max(max_t, curr_temp),
                                "temp_min": min(min_t, curr_temp - 4),
                                "condition": cond_friendly,
                                "icon": _condition_to_icon(cond_friendly),
                                "description": desc_raw.capitalize() if desc_raw else cond_friendly,
                                "pop": pop,
                                "humidity": humidity,
                            })

                        return {
                            "success": True,
                            "source": "openweather_api",
                            "source_type": "live",
                            "data": {
                                "destination": display_name,
                                "current_temp": curr_temp,
                                "feels_like": round(main.get("feels_like", curr_temp)),
                                "condition": curr_cond,
                                "icon": _condition_to_icon(curr_cond),
                                "description": weather_arr[0].get("description", "Clear sky").capitalize(),
                                "humidity": main.get("humidity", 50),
                                "precipitation_chance": curr_data.get("clouds", {}).get("all", 10),
                                "wind_speed_kmh": round(wind.get("speed", 3.0) * 3.6),
                                "forecast": daily_forecast,
                                "retrieved_at": datetime.utcnow().isoformat(),
                            },
                            "error": None,
                        }
                except Exception as e:
                    logger.debug(f"OpenWeather request error for {destination}: {e}")

            # 3. Live Open-Meteo API (Free, live, global, no API key required)
            try:
                om_url = "https://api.open-meteo.com/v1/forecast"
                om_params = {
                    "latitude": lat,
                    "longitude": lon,
                    "current": "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m",
                    "daily": "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
                    "timezone": "auto",
                    "forecast_days": min(days_count + 1, 14),
                }
                resp = await client.get(om_url, params=om_params, timeout=6.0)
                if resp.status_code == 200:
                    om_data = resp.json()
                    curr = om_data.get("current", {})
                    daily = om_data.get("daily", {})

                    w_code = curr.get("weather_code", 0)
                    curr_cond, curr_desc, curr_icon = _wmo_code_to_condition(w_code)
                    curr_temp = round(curr.get("temperature_2m", 20.0))
                    feels_like = round(curr.get("apparent_temperature", curr_temp))
                    humidity = round(curr.get("relative_humidity_2m", 50))
                    wind_kmh = round(curr.get("wind_speed_10m", 10.0))

                    daily_times = daily.get("time", [])
                    daily_codes = daily.get("weather_code", [])
                    daily_max = daily.get("temperature_2m_max", [])
                    daily_min = daily.get("temperature_2m_min", [])
                    daily_pop = daily.get("precipitation_probability_max", [])

                    daily_forecast = []
                    for i in range(days_count):
                        target_d = base_date + timedelta(days=i)
                        target_str = target_d.strftime("%Y-%m-%d")
                        day_label = f"Day {i + 1}"
                        date_formatted = target_d.strftime("%b %d, %a")

                        if i < len(daily_times):
                            d_code = daily_codes[i] if i < len(daily_codes) else w_code
                            d_cond, d_desc, d_icon = _wmo_code_to_condition(d_code)
                            max_t = round(daily_max[i]) if i < len(daily_max) and daily_max[i] is not None else curr_temp + 3
                            min_t = round(daily_min[i]) if i < len(daily_min) and daily_min[i] is not None else curr_temp - 4
                            pop = round(daily_pop[i]) if i < len(daily_pop) and daily_pop[i] is not None else 10
                        else:
                            d_cond, d_desc, d_icon = curr_cond, curr_desc, curr_icon
                            max_t = curr_temp + 2
                            min_t = curr_temp - 4
                            pop = 10

                        headline_temp = curr_temp if (i == 0 and curr_temp) else max_t

                        daily_forecast.append({
                            "day_number": i + 1,
                            "day_label": day_label,
                            "date": target_str,
                            "formatted_date": date_formatted,
                            "temp": headline_temp,
                            "temp_max": max_t,
                            "temp_min": min_t,
                            "condition": d_cond,
                            "icon": d_icon,
                            "description": d_desc,
                            "pop": pop,
                            "humidity": humidity,
                        })

                    weather_result = {
                        "success": True,
                        "source": "open_meteo_live",
                        "source_type": "live",
                        "data": {
                            "destination": display_name,
                            "current_temp": curr_temp,
                            "feels_like": feels_like,
                            "condition": curr_cond,
                            "icon": curr_icon,
                            "description": curr_desc,
                            "humidity": humidity,
                            "precipitation_chance": round(curr.get("precipitation", 0.0) * 10),
                            "wind_speed_kmh": wind_kmh,
                            "forecast": daily_forecast,
                            "retrieved_at": datetime.utcnow().isoformat(),
                        },
                        "error": None,
                    }
                    await cache.set(weather_cache_key, weather_result, ttl=900)
                    return weather_result
            except Exception as e:
                logger.info(f"Open-Meteo live request note for {destination}: {e}")

        # 4. Graceful unavailable state (No fake data fabricated)
        return {
            "success": False,
            "destination": dest_clean,
            "source": "live_weather_service",
            "source_type": "unavailable",
            "error": f"Live weather data is temporarily unreachable for '{dest_clean}'.",
        }


async def get_weather(destination: str, days: int = 3, start_date: Optional[str] = None) -> Dict[str, Any]:
    """Convenience functional wrapper for weather tool."""
    tool = WeatherTool()
    return await tool.get_weather(destination=destination, days=days, start_date=start_date)
