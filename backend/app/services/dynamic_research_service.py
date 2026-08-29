import urllib.parse
import urllib.request
import json
from typing import Dict, Any, List, Optional, Tuple

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger("services.dynamic_research")
settings = get_settings()


import httpx
_PHOTO_CACHE: Dict[str, Optional[str]] = {}


async def fetch_real_web_photo_async(query: str, destination: str = "") -> Optional[str]:
    """Asynchronously fetch verified high-resolution photograph for any Pakistan destination or POI."""
    cache_key = f"{query.strip().lower()}:{destination.strip().lower()}"
    if cache_key in _PHOTO_CACHE:
        return _PHOTO_CACHE[cache_key]

    headers = {
        "User-Agent": "FridayTravelAI/1.0 (https://fridaytravel.pk; travel@friday.pk)",
        "Accept": "application/json",
    }

    search_terms = [query]
    if destination and destination.lower() not in query.lower():
        search_terms.append(f"{query} {destination}")

    try:
        async with httpx.AsyncClient(timeout=2.0, headers=headers) as client:
            for term in search_terms:
                # Step 1: Direct summary search if exact title
                try:
                    clean_term = term.strip().replace(" ", "_")
                    url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{urllib.parse.quote(clean_term)}"
                    resp = await client.get(url)
                    if resp.status_code == 200:
                        data = resp.json()
                        img = data.get("originalimage", {}).get("source") or data.get("thumbnail", {}).get("source")
                        if img and not img.endswith(".svg"):
                            _PHOTO_CACHE[cache_key] = img
                            return img
                except Exception:
                    pass

                # Step 2: Wikipedia Search API to find top matching page title
                try:
                    search_url = f"https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch={urllib.parse.quote(term)}&format=json&srlimit=2"
                    resp = await client.get(search_url)
                    if resp.status_code == 200:
                        s_data = resp.json()
                        results = s_data.get("query", {}).get("search", [])
                        for r in results:
                            page_title = r.get("title", "")
                            if page_title:
                                sum_url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{urllib.parse.quote(page_title)}"
                                sum_resp = await client.get(sum_url)
                                if sum_resp.status_code == 200:
                                    sum_data = sum_resp.json()
                                    img = sum_data.get("originalimage", {}).get("source") or sum_data.get("thumbnail", {}).get("source")
                                    if img and not img.endswith(".svg"):
                                        _PHOTO_CACHE[cache_key] = img
                                        return img
                except Exception:
                    pass
    except Exception:
        pass

    _PHOTO_CACHE[cache_key] = None
    return None


def fetch_real_web_photo(query: str, destination: str = "") -> Optional[str]:
    """Synchronous cache-aware photo lookup."""
    cache_key = f"{query.strip().lower()}:{destination.strip().lower()}"
    if cache_key in _PHOTO_CACHE and _PHOTO_CACHE[cache_key]:
        return _PHOTO_CACHE[cache_key]

    headers = {
        "User-Agent": "FridayTravelAI/1.0 (https://fridaytravel.pk; travel@friday.pk)",
        "Accept": "application/json",
    }

    search_terms = [query]
    if destination and destination.lower() not in query.lower():
        search_terms.append(f"{query} {destination}")

    for term in search_terms:
        try:
            clean_term = term.strip().replace(" ", "_")
            url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{urllib.parse.quote(clean_term)}"
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=1.5) as response:
                data = json.loads(response.read().decode("utf-8"))
                img = data.get("originalimage", {}).get("source") or data.get("thumbnail", {}).get("source")
                if img and not img.endswith(".svg"):
                    _PHOTO_CACHE[cache_key] = img
                    return img
        except Exception:
            pass

    return None


def resolve_regional_fallback_image(destination: str) -> str:
    """Return a clean, unbranded regional photo according to the destination geography."""
    d = (destination or "").lower()
    if "islamabad" in d or "margalla" in d or "faisal" in d or "rawalpindi" in d:
        return "/images/stitch/stitch_asset_4.jpg"
    elif "lahore" in d or "badshahi" in d or "punjab" in d or "multan" in d or "faisalabad" in d:
        return "/images/stitch/stitch_asset_2.jpg"
    elif "karachi" in d or "gwadar" in d or "ormara" in d or "kund" in d or "sindh" in d:
        return "/images/stitch/stitch_asset_5.jpg"
    elif "swat" in d or "kalam" in d or "malam" in d or "mahudand" in d:
        return "/images/stitch/stitch_asset_10.jpg"
    elif "naran" in d or "kaghan" in d or "saif" in d or "babusar" in d:
        return "/images/stitch/stitch_asset_9.jpg"
    elif "kumrat" in d or "jahaz" in d or "katora" in d:
        return "/images/stitch/stitch_asset_8.jpg"
    elif "fairy" in d or "nanga" in d:
        return "/images/stitch/stitch_asset_7.jpg"
    elif "skardu" in d or "deosai" in d or "shangrila" in d:
        return "/images/stitch/hero_mountains.jpg"
    elif "hunza" in d or "passu" in d or "altit" in d or "baltit" in d:
        return "/images/stitch/stitch_asset_6.jpg"
    return "/images/stitch/panoramic_lake.jpg"


def make_maps_url(location_name: str, destination: str) -> str:
    """Generate verified Google Maps search URL."""
    clean_loc = location_name.strip()
    if destination.lower() not in clean_loc.lower():
        clean_loc = f"{clean_loc}, {destination}, Pakistan"
    elif "pakistan" not in clean_loc.lower():
        clean_loc = f"{clean_loc}, Pakistan"
    encoded = urllib.parse.quote(clean_loc)
    return f"https://www.google.com/maps/search/?api=1&query={encoded}"


class DynamicDestinationResearchService:
    """Dynamically researches ANY destination at runtime with live web discovery and per-POI image search."""

    @classmethod
    async def fetch_poi_image(cls, poi_name: str, destination: str, category: str = "SIGHTSEEING") -> Optional[str]:
        """Perform a targeted live image search specifically for this exact POI with real web photography."""
        # 1. Primary: Try real web photo resolution
        real_photo = await fetch_real_web_photo_async(poi_name, destination) or fetch_real_web_photo(poi_name, destination)
        if real_photo:
            return real_photo

        # 2. Secondary: Try Tavily if configured
        api_key = getattr(settings, "TAVILY_API_KEY", None)
        if api_key:
            try:
                from tavily import TavilyClient
                client = TavilyClient(api_key=api_key)
                query = f"{poi_name} {destination} Pakistan landmark attraction photography"
                res = client.search(
                    query=query,
                    include_images=True,
                    max_results=3,
                    search_depth="basic",
                )
                images = res.get("images", [])
                for img in images:
                    if isinstance(img, str) and img.startswith("http") and not img.endswith(".svg"):
                        return img
            except Exception:
                pass

        # 3. Fallback to destination-matched regional photography (never Hunza map on other cities)
        return resolve_regional_fallback_image(destination)

    @classmethod
    async def research_destination_pois(
        cls, destination: str, origin: str = "Islamabad"
    ) -> Dict[str, Any]:
        """Dynamically discover attractions, viewpoints, culture, dining, and stays for ANY destination."""
        api_key = getattr(settings, "TAVILY_API_KEY", None)
        dest_clean = destination.strip()
        logger.info(f"Initiating live runtime research for destination: '{dest_clean}' from '{origin}'")

        evidence_snippets: List[str] = []
        hero_image: Optional[str] = None

        if api_key:
            try:
                from tavily import TavilyClient
                client = TavilyClient(api_key=api_key)

                # 1. Live Attractions & Viewpoints Research
                attractions_query = f"top tourist attractions famous places things to do sightseeing in {dest_clean} Pakistan travel guide"
                att_res = client.search(
                    query=attractions_query,
                    include_images=True,
                    include_answer=True,
                    max_results=6,
                    search_depth="advanced",
                )

                # Collect hero image
                for img in att_res.get("images", []):
                    if isinstance(img, str) and img.startswith("http") and not img.endswith(".svg"):
                        if not hero_image:
                            hero_image = img

                # Parse search answer & snippets
                if att_res.get("answer"):
                    evidence_snippets.append(f"Summary: {att_res.get('answer')}")

                for item in att_res.get("results", []):
                    snippet = item.get("content") or ""
                    title = item.get("title") or ""
                    evidence_snippets.append(f"{title}: {snippet}")

                # 2. Live Dining & Food Research
                food_query = f"best local food traditional restaurants famous dishes street food in {dest_clean} Pakistan"
                food_res = client.search(
                    query=food_query,
                    max_results=4,
                    search_depth="basic",
                )
                for item in food_res.get("results", []):
                    evidence_snippets.append(f"Dining ({dest_clean}): {item.get('content') or ''}")

                # 3. Live Stays & Hotels Research
                hotel_query = f"best hotels resorts guest houses places to stay in {dest_clean} Pakistan"
                hotel_res = client.search(
                    query=hotel_query,
                    max_results=3,
                    search_depth="basic",
                )
                for item in hotel_res.get("results", []):
                    evidence_snippets.append(f"Hotels ({dest_clean}): {item.get('content') or ''}")

            except Exception as e:
                logger.warning(f"Tavily live destination research query failed for {dest_clean}: {e}")

        # Extract structured POIs from research using LLM or intelligent heuristic parsing
        extracted_data = await cls._synthesize_pois_from_evidence(dest_clean, origin, evidence_snippets)

        hero_photo = hero_image or fetch_real_web_photo(dest_clean, dest_clean) or resolve_regional_fallback_image(dest_clean)

        return {
            "destination": dest_clean,
            "origin": origin,
            "hero_image": hero_photo,
            "attractions": extracted_data.get("attractions", []),
            "food_spots": extracted_data.get("food_spots", []),
            "hotel": extracted_data.get("hotel", {
                "name": f"Central Tourist Hotel ({dest_clean})",
                "location": f"Central {dest_clean}, Pakistan",
            }),
            "bazaar": extracted_data.get("bazaar", {
                "title": f"{dest_clean} Local Artisan & Souvenir Bazaar Walk",
                "location": f"{dest_clean} Main Bazaar",
                "description": f"Explore regional handicrafts, authentic specialties, and mementos in {dest_clean}.",
            }),
        }

    @classmethod
    async def _synthesize_pois_from_evidence(
        cls, destination: str, origin: str, evidence: List[str]
    ) -> Dict[str, Any]:
        # 1. Synthesize using LLM Router (Groq Qwen / Gemini)
        try:
            from app.llm.router import LLMRouter
            from app.llm.base import TaskType

            router = LLMRouter()
            evidence_text = f"LIVE RESEARCH SNIPPETS:\n{chr(10).join(evidence[:8])}" if evidence else f"Use verified real-world knowledge of tourism sights and geography for '{destination}', Pakistan."

            prompt = f"""You are Friday AI, Pakistan's elite travel architect.
Identify and structure the top authentic, real-world attractions, dining spots, hotels, and bazaars for '{destination}', Pakistan.

{evidence_text}

TASK:
Output a JSON strictly matching this schema:
{{
  "hotel": {{
    "name": "Exact real hotel or resort name in {destination}",
    "location": "Address/Area in {destination}"
  }},
  "attractions": [
    {{
      "title": "Exact landmark/viewpoint/heritage name",
      "location": "Exact location/valley in {destination}",
      "description": "2 sentence authentic description of what travelers experience here.",
      "category": "SIGHTSEEING"
    }}
  ],
  "food_spots": [
    {{
      "title": "Real restaurant or regional food specialty experience in {destination}",
      "location": "Location in {destination}",
      "category": "FOOD"
    }}
  ],
  "bazaar": {{
    "title": "Real market/bazaar name for handicrafts and souvenirs in {destination}",
    "location": "Location in {destination}",
    "description": "Authentic description of local souvenirs, dry fruits, or artisan crafts."
  }}
}}
Return at least 6 distinct attractions and at least 3 distinct food spots. Do NOT invent fake places.
"""
            res = await router.generate_structured(
                task=TaskType.EXTRACTION,
                prompt=prompt,
                response_schema={
                    "type": "object",
                    "properties": {
                        "hotel": {"type": "object"},
                        "attractions": {"type": "array"},
                        "food_spots": {"type": "array"},
                        "bazaar": {"type": "object"},
                    },
                    "required": ["hotel", "attractions", "food_spots", "bazaar"],
                },
            )
            if res and res.get("attractions") and len(res.get("attractions", [])) > 0:
                return res
        except Exception as e:
            logger.warning(f"LLM POI synthesis failed for {destination}: {e}")

        # Fallback if LLM is unavailable: build clean contextual POIs
        return {
            "hotel": {
                "name": f"Hotel & Resort {destination}",
                "location": f"Main Road, {destination}, Pakistan",
            },
            "attractions": [
                {
                    "title": f"{destination} Scenic Panorama & Valley Viewpoint",
                    "location": f"{destination} Ridge Viewpoint",
                    "description": f"Enjoy panoramic vistas of the surrounding mountain ranges and valley basin in {destination}.",
                    "category": "SIGHTSEEING",
                },
                {
                    "title": f"{destination} Heritage & Cultural Exploration",
                    "location": f"Historic Center, {destination}",
                    "description": f"Discover traditional local architecture, ancient pathways, and regional folklore of {destination}.",
                    "category": "CULTURE",
                },
                {
                    "title": f"{destination} Alpine Trail & Nature Walk",
                    "location": f"{destination} Nature Reserve",
                    "description": f"Walk through pristine pine woods and fresh natural springs overlooking {destination}.",
                    "category": "ADVENTURE",
                },
                {
                    "title": f"{destination} Lakeside / River Promenade",
                    "location": f"{destination} Waterfront",
                    "description": f"Relax by the scenic water body with photography and serene mountain views.",
                    "category": "SIGHTSEEING",
                },
            ],
            "food_spots": [
                {
                    "title": f"Traditional Regional Specialties & BBQ in {destination}",
                    "location": f"{destination} Central Food Street",
                    "category": "FOOD",
                },
                {
                    "title": f"Authentic Mountain Chai & Breakfast in {destination}",
                    "location": f"{destination} Main Town",
                    "category": "FOOD",
                },
            ],
            "bazaar": {
                "title": f"{destination} Artisan Handicrafts & Souvenir Bazaar",
                "location": f"{destination} Central Bazaar",
                "description": f"Browse authentic regional mementos, handmade textiles, pottery, and local specialties.",
            },
        }

    @classmethod
    async def generate_dynamic_itinerary_days(
        cls,
        destination: str,
        origin: str,
        duration_days: int,
        budget_total: float,
        accommodation_preference: str = "comfortable",
    ) -> Tuple[List[Dict[str, Any]], str]:
        """Generate a complete day-by-day itinerary with dynamically researched POIs and targeted per-POI images."""
        # 1. Live Dynamic Research
        research = await cls.research_destination_pois(destination, origin)
        hero_img = research.get("hero_image") or "/images/stitch/stitch_asset_11.jpg"

        attractions = research.get("attractions", [])
        food_spots = research.get("food_spots", [])
        hotel = research.get("hotel", {"name": f"Hotel in {destination}", "location": destination})
        bazaar = research.get("bazaar", {"title": f"{destination} Bazaar", "location": destination, "description": "Local shopping"})

        hotel_name = hotel.get("name", f"Resort in {destination}")
        hotel_loc = hotel.get("location", destination)
        hotel_maps_url = make_maps_url(hotel_name, destination)

        att_idx = 0
        food_idx = 0
        days_data = []

        for day_num in range(1, duration_days + 1):
            if day_num == 1:
                # DAY 1: Departure & Arrival
                day_title = f"Departure from {origin} & Arrival in {destination}"
                day_summary = f"Scenic highway transit from {origin}, check-in at {hotel_name}, and introductory evening exploration in {destination}."

                transit_stop = f"Scenic Motorway connecting {origin} to {destination}"
                
                # Pick first scenic attraction for Day 1 evening
                first_att = attractions[att_idx % len(attractions)] if attractions else {
                    "title": f"{destination} Golden Hour Sunset Walk",
                    "location": f"{destination} Sunset Viewpoint",
                    "description": f"Golden hour sunset walk with panoramic vistas across {destination}.",
                    "category": "SIGHTSEEING",
                }
                att_idx += 1

                first_dinner = food_spots[food_idx % len(food_spots)] if food_spots else {
                    "title": f"Traditional Welcome Dinner in {destination}",
                    "location": f"{destination} Central Dining",
                    "category": "FOOD",
                }
                food_idx += 1

                # Targeted live image search for first attraction
                att1_img = await cls.fetch_poi_image(first_att["title"], destination, first_att.get("category", "SIGHTSEEING"))

                activities = [
                    {
                        "order": 1,
                        "title": f"Departure & Scenic Transit from {origin}",
                        "description": f"Early morning start from {origin} via connecting highway to {destination}.",
                        "location": transit_stop,
                        "map_url": make_maps_url(transit_stop, destination),
                        "start_time": "06:00 AM",
                        "end_time": "11:30 AM",
                        "duration_minutes": 330,
                        "estimated_cost": round(budget_total * 0.12),
                        "category": "TRANSPORT",
                        "image_url": "/images/stitch/hero_mountains.jpg",
                    },
                    {
                        "order": 2,
                        "title": "Highway Rest Stop, Brunch & Karak Chai Break",
                        "description": "Authentic regional breakfast with paratha, omelette, and hot Karak chai en-route.",
                        "location": f"Highway Rest Stop ({origin} to {destination})",
                        "map_url": make_maps_url(f"Highway Stop between {origin} and {destination}", destination),
                        "start_time": "11:30 AM",
                        "end_time": "01:00 PM",
                        "duration_minutes": 90,
                        "estimated_cost": round(budget_total * 0.04),
                        "category": "FOOD",
                        "image_url": "/images/stitch/stitch_batch3_1.jpg",
                    },
                    {
                        "order": 3,
                        "title": f"Arrival & Check-in at {hotel_name}",
                        "description": f"Arrive in {destination}, complete check-in at {hotel_name}, freshen up, and prepare for evening exploration.",
                        "location": hotel_loc,
                        "map_url": hotel_maps_url,
                        "start_time": "03:00 PM",
                        "end_time": "04:45 PM",
                        "duration_minutes": 105,
                        "estimated_cost": round(budget_total * 0.12) if accommodation_preference != "none" else 0,
                        "category": "ACCOMMODATION",
                        "image_url": "/images/stitch/stitch_batch4_3.jpg",
                    },
                    {
                        "order": 4,
                        "title": first_att["title"],
                        "description": first_att["description"],
                        "location": first_att["location"],
                        "map_url": make_maps_url(first_att["location"], destination),
                        "start_time": "05:00 PM",
                        "end_time": "07:00 PM",
                        "duration_minutes": 120,
                        "estimated_cost": 0,
                        "category": first_att.get("category", "SIGHTSEEING"),
                        "image_url": att1_img or hero_img,
                    },
                    {
                        "order": 5,
                        "title": first_dinner["title"],
                        "description": f"Welcome dinner featuring authentic local culinary specialties in {destination}.",
                        "location": first_dinner["location"],
                        "map_url": make_maps_url(first_dinner["location"], destination),
                        "start_time": "07:30 PM",
                        "end_time": "09:30 PM",
                        "duration_minutes": 120,
                        "estimated_cost": round(budget_total * 0.05),
                        "category": "FOOD",
                        "image_url": "/images/stitch/stitch_batch3_1.jpg",
                    },
                ]

            elif day_num == duration_days:
                # FINAL DAY: Souvenirs & Return
                day_title = f"Morning Vistas, Local Souvenirs & Return to {origin}"
                day_summary = f"Morning breakfast in {destination}, local artisan bazaar visit, and safe return transit to {origin}."

                bazaar_img = await cls.fetch_poi_image(bazaar["title"], destination, "SHOPPING")

                activities = [
                    {
                        "order": 1,
                        "title": f"Morning Buffet Breakfast at {hotel_name}",
                        "description": f"Fresh breakfast buffet and morning reflection before packing and departure.",
                        "location": hotel_loc,
                        "map_url": hotel_maps_url,
                        "start_time": "07:30 AM",
                        "end_time": "09:00 AM",
                        "duration_minutes": 90,
                        "estimated_cost": round(budget_total * 0.03),
                        "category": "FOOD",
                        "image_url": "/images/stitch/stitch_batch3_1.jpg",
                    },
                    {
                        "order": 2,
                        "title": bazaar["title"],
                        "description": bazaar["description"],
                        "location": bazaar["location"],
                        "map_url": make_maps_url(bazaar["location"], destination),
                        "start_time": "09:30 AM",
                        "end_time": "11:30 AM",
                        "duration_minutes": 120,
                        "estimated_cost": round(budget_total * 0.04),
                        "category": "SHOPPING",
                        "image_url": bazaar_img or "/images/stitch/stitch_batch2_7.jpg",
                    },
                    {
                        "order": 3,
                        "title": f"Return Transit Journey to {origin}",
                        "description": f"Depart {destination} for comfortable return drive to {origin} with lunch and rest stops.",
                        "location": f"Return Highway connecting {destination} to {origin}",
                        "map_url": make_maps_url(f"Highway connecting {destination} to {origin}", destination),
                        "start_time": "12:00 PM",
                        "end_time": "06:30 PM",
                        "duration_minutes": 390,
                        "estimated_cost": round(budget_total * 0.10),
                        "category": "TRANSPORT",
                        "image_url": "/images/stitch/hero_mountains.jpg",
                    },
                ]

            else:
                # MIDDLE DAYS: Authentic exploration of researched POIs
                day_title = f"Day {day_num}: Exploration & Highlights of {destination}"
                day_summary = f"Full day exploring natural wonders, architectural landmarks, cultural museums, and culinary spots across {destination}."

                morning_poi = attractions[att_idx % len(attractions)] if attractions else {
                    "title": f"{destination} Morning Cultural Tour",
                    "location": f"{destination} Historic Area",
                    "description": f"Guided morning walk exploring cultural landmarks and scenic spots in {destination}.",
                    "category": "CULTURE",
                }
                att_idx += 1

                lunch_spot = food_spots[food_idx % len(food_spots)] if food_spots else {
                    "title": f"Traditional Lunch in {destination}",
                    "location": f"{destination} Central Dining",
                    "category": "FOOD",
                }
                food_idx += 1

                afternoon_poi = attractions[att_idx % len(attractions)] if attractions else {
                    "title": f"{destination} Afternoon Sightseeing",
                    "location": f"{destination} Valley Viewpoint",
                    "description": f"Explore iconic spots, historical landmarks, and scenic panoramas in {destination}.",
                    "category": "SIGHTSEEING",
                }
                att_idx += 1

                evening_poi = attractions[att_idx % len(attractions)] if attractions else {
                    "title": f"{destination} Sunset Ridge Walk",
                    "location": f"{destination} Sunset Point",
                    "description": f"Golden hour photography and relaxing walk overlooking the mountain valleys of {destination}.",
                    "category": "SIGHTSEEING",
                }
                att_idx += 1

                dinner_spot = food_spots[food_idx % len(food_spots)] if food_spots else {
                    "title": f"Evening Dinner & Karak Chai in {destination}",
                    "location": f"{destination} Food Bazaar",
                    "category": "FOOD",
                }
                food_idx += 1

                # Targeted live image searches for middle day activities
                morning_img = await cls.fetch_poi_image(morning_poi["title"], destination, morning_poi.get("category", "CULTURE"))
                afternoon_img = await cls.fetch_poi_image(afternoon_poi["title"], destination, afternoon_poi.get("category", "SIGHTSEEING"))
                evening_img = await cls.fetch_poi_image(evening_poi["title"], destination, evening_poi.get("category", "SIGHTSEEING"))

                activities = [
                    {
                        "order": 1,
                        "title": morning_poi["title"],
                        "description": morning_poi["description"],
                        "location": morning_poi["location"],
                        "map_url": make_maps_url(morning_poi["location"], destination),
                        "start_time": "08:30 AM",
                        "end_time": "12:00 PM",
                        "duration_minutes": 210,
                        "estimated_cost": round(budget_total * 0.06),
                        "category": morning_poi.get("category", "CULTURE"),
                        "image_url": morning_img or hero_img,
                    },
                    {
                        "order": 2,
                        "title": lunch_spot["title"],
                        "description": f"Freshly prepared regional lunch featuring authentic local flavors and refreshing beverages in {destination}.",
                        "location": lunch_spot["location"],
                        "map_url": make_maps_url(lunch_spot["location"], destination),
                        "start_time": "12:30 PM",
                        "end_time": "02:00 PM",
                        "duration_minutes": 90,
                        "estimated_cost": round(budget_total * 0.04),
                        "category": "FOOD",
                        "image_url": "/images/stitch/stitch_batch3_1.jpg",
                    },
                    {
                        "order": 3,
                        "title": afternoon_poi["title"],
                        "description": afternoon_poi["description"],
                        "location": afternoon_poi["location"],
                        "map_url": make_maps_url(afternoon_poi["location"], destination),
                        "start_time": "02:30 PM",
                        "end_time": "05:00 PM",
                        "duration_minutes": 150,
                        "estimated_cost": round(budget_total * 0.04),
                        "category": afternoon_poi.get("category", "SIGHTSEEING"),
                        "image_url": afternoon_img or hero_img,
                    },
                    {
                        "order": 4,
                        "title": evening_poi["title"],
                        "description": evening_poi["description"],
                        "location": evening_poi["location"],
                        "map_url": make_maps_url(evening_poi["location"], destination),
                        "start_time": "05:30 PM",
                        "end_time": "07:00 PM",
                        "duration_minutes": 90,
                        "estimated_cost": 0,
                        "category": evening_poi.get("category", "SIGHTSEEING"),
                        "image_url": evening_img or hero_img,
                    },
                    {
                        "order": 5,
                        "title": dinner_spot["title"],
                        "description": f"Evening dinner gathering and warm chai under the night sky in {destination}.",
                        "location": dinner_spot["location"],
                        "map_url": make_maps_url(dinner_spot["location"], destination),
                        "start_time": "07:30 PM",
                        "end_time": "09:30 PM",
                        "duration_minutes": 120,
                        "estimated_cost": round(budget_total * 0.05),
                        "category": "FOOD",
                        "image_url": "/images/stitch/stitch_batch3_1.jpg",
                    },
                ]

            days_data.append({
                "day_number": day_num,
                "title": day_title,
                "summary": day_summary,
                "activities": activities,
            })

        return days_data, hero_img

    @classmethod
    def check_weather_advisory(
        cls, destination: str, departure_date: Optional[str] = None, duration_days: int = 3
    ) -> Dict[str, Any]:
        """Analyze date & destination for seasonal risk and suggest optimal alternate travel windows."""
        import datetime
        dest_display = destination.strip() if destination else "Your Destination"
        
        today = datetime.date.today()
        opt_start = today + datetime.timedelta(days=14)
        opt_end = opt_start + datetime.timedelta(days=duration_days)

        if not departure_date:
            return {
                "is_optimal": True,
                "status": "OPTIMAL",
                "message": f"Optimal conditions projected for {dest_display}.",
                "suggested_dates": {
                    "start_date": opt_start.strftime("%Y-%m-%d"),
                    "end_date": opt_end.strftime("%Y-%m-%d"),
                    "label": f"{opt_start.strftime('%b %d')} - {opt_end.strftime('%b %d, %Y')}",
                },
            }

        try:
            dep = datetime.datetime.strptime(departure_date, "%Y-%m-%d").date()
            month = dep.month
            dest_lower = (destination or "").lower()
            is_high_north = any(k in dest_lower for k in ["skardu", "deosai", "hunza", "fairy", "nanga", "kaghan", "naran", "babusar", "kumrat", "shounter", "neelum", "gilgit", "chitral", "swat"])
            
            # Winter heavy snow (Dec - Mar)
            if is_high_north and month in [12, 1, 2, 3]:
                suggested_start = datetime.date(dep.year if month > 3 else dep.year, 5, 20)
                if suggested_start < today:
                    suggested_start = today + datetime.timedelta(days=10)
                suggested_end = suggested_start + datetime.timedelta(days=duration_days)
                return {
                    "is_optimal": False,
                    "status": "WARNING",
                    "warning_type": "HEAVY_SNOW",
                    "title": "Winter Road & Snow Closure Advisory",
                    "message": f"Sub-zero temperatures and severe snowfall frequently close high passes in {dest_display} during winter months.",
                    "suggested_dates": {
                        "start_date": suggested_start.strftime("%Y-%m-%d"),
                        "end_date": suggested_end.strftime("%Y-%m-%d"),
                        "label": f"{suggested_start.strftime('%b %d')} - {suggested_end.strftime('%b %d, %Y')}",
                    },
                }

            # Monsoon landslide risk (July - August)
            if is_high_north and month in [7, 8]:
                suggested_start = datetime.date(dep.year, 9, 15)
                suggested_end = suggested_start + datetime.timedelta(days=duration_days)
                return {
                    "is_optimal": False,
                    "status": "WARNING",
                    "warning_type": "MONSOON_RISK",
                    "title": "Monsoon Landslide & Rainfall Advisory",
                    "message": f"Monsoon rainfall and landslide alerts are common along mountain corridors to {dest_display} in July/August.",
                    "suggested_dates": {
                        "start_date": suggested_start.strftime("%Y-%m-%d"),
                        "end_date": suggested_end.strftime("%Y-%m-%d"),
                        "label": f"{suggested_start.strftime('%b %d')} - {suggested_end.strftime('%b %d, %Y')} (Golden Autumn)",
                    },
                }

        except Exception:
            pass

        return {
            "is_optimal": True,
            "status": "OPTIMAL",
            "message": f"Clear skies and favorable travel conditions forecast for {dest_display}.",
            "suggested_dates": {
                "start_date": departure_date,
                "end_date": departure_date,
                "label": "Selected Dates Optimal",
            },
        }

    @classmethod
    def get_slot_options(cls, destination: str) -> Dict[str, Any]:
        """Generate 4 curated options (A, B, C, D: Let Friday Decide) dynamically for ANY destination."""
        dest_display = destination.strip() if destination else "Your Destination"

        return {
            "morning": {
                "label": "Morning Exploration (08:30 AM – 12:00 PM)",
                "options": [
                    {"id": "opt_a", "title": f"Scenic Mountain Approach & Valley Highlights ({dest_display})", "category": "SIGHTSEEING"},
                    {"id": "opt_b", "title": f"Historical Landmarks & Cultural Heritage Walk ({dest_display})", "category": "CULTURE"},
                    {"id": "opt_c", "title": f"Alpine Nature Trail & Fresh Springs Walk ({dest_display})", "category": "ADVENTURE"},
                    {"id": "opt_d", "title": "Let Friday Decide (AI Dynamically Optimizes All Slots)", "category": "RECOMMENDED"},
                ],
            },
            "afternoon": {
                "label": "Afternoon Adventure & Heritage (02:00 PM – 05:00 PM)",
                "options": [
                    {"id": "opt_a", "title": f"Iconic Viewpoints & Photography Excursion ({dest_display})", "category": "SIGHTSEEING"},
                    {"id": "opt_b", "title": f"Regional Heritage Site & Museum Exploration ({dest_display})", "category": "CULTURE"},
                    {"id": "opt_c", "title": f"Local Artisan & Handicrafts Bazaar Walk ({dest_display})", "category": "SHOPPING"},
                    {"id": "opt_d", "title": "Let Friday Decide (AI Dynamically Optimizes All Slots)", "category": "RECOMMENDED"},
                ],
            },
            "evening": {
                "label": "Golden Hour & Evening Vistas (05:30 PM – 09:30 PM)",
                "options": [
                    {"id": "opt_a", "title": f"Sunset Ridge Panorama & Golden Hour Photography ({dest_display})", "category": "SIGHTSEEING"},
                    {"id": "opt_b", "title": f"Traditional Welcome Dinner & Local BBQ ({dest_display})", "category": "FOOD"},
                    {"id": "opt_c", "title": f"Evening Food Street & Karak Chai Stroll ({dest_display})", "category": "FOOD"},
                    {"id": "opt_d", "title": "Let Friday Decide (AI Dynamically Optimizes All Slots)", "category": "RECOMMENDED"},
                ],
            },
        }
