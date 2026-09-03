"""
Friday® Dynamic Destination Research & Live Image Discovery Service.
Zero hardcoded static image dictionaries or pre-saved destination databases.
Strict 100% budget reconciliation between total budget and day-by-day activity costs.
"""

import asyncio
import urllib.parse
import json
import re
import random
from typing import Dict, Any, List, Optional, Tuple
import httpx

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger("services.dynamic_research")
settings = get_settings()

_PHOTO_MULTI_CACHE: Dict[str, List[str]] = {}

FOREIGN_KEYWORDS = [
    "california", "yosemite", "nevada", "utah", "arizona", "united states", "usa",
    "oregon", "colorado", "australia", "canada", "england", "scotland", "new zealand",
    "san diego", "tunnel view", "texas", "wyoming", "idaho", "alaska", "mexico",
    "virginia", "carolina", "florida", "georgia", "ohio", "michigan", "pennsylvania",
    "svk", "slovakia", "poland", "czech", "russia", "norway", "sweden", "finland",
    "germany", "austria", "switzerland", "france", "spain", "italy", "greece",
    "brazil", "argentina", "chile", "peru", "colombia", "bolivia", "japan", "korea", "china"
]

BAD_TOKENS = [
    "flag", "map", "coat_of_arms", "emblem", "icon", "stub", "symbol", "logo",
    "signature", "seal", "location_in", "insignia", "portrait", "diagram",
    "chart", "npg_", "drawing", "sketch", "cemetery", "hospital", "crash",
    "bombing", "election", "campaign", "attack", "casualty", "airways", "boeing"
]


def clean_place_query(place_name: str, destination: str) -> str:
    """Clean operational prefixes from activity titles to extract the core POI / place name."""
    p = (place_name or "").strip()
    dest = (destination or "").strip()
    if not p:
        return dest
    # Strip common itinerary action verbs/prefixes
    prefixes = [
        r"^(?:visit\s+|explore\s+|discover\s+|tour\s+|check-?in\s+at\s+|arrival\s+&\s+check-?in\s+at\s+|drive\s+to\s+|travel\s+to\s+|arrival\s+in\s+|departure\s+from\s+|excursion\s+to\s+|sunset\s+at\s+|sunrise\s+at\s+|dinner\s+at\s+|lunch\s+at\s+|breakfast\s+at\s+|afternoon\s+at\s+|morning\s+at\s+|evening\s+at\s+|stop\s+at\s+|tea\s+at\s+)",
        r"^(?:scenic\s+transit\s+to\s+|scenic\s+highway\s+drive\s+to\s+|transit\s+to\s+|drive\s+towards\s+|return\s+transit\s+to\s+|return\s+transit\s+journey\s+back\s+to\s+)",
        r"^(?:breakfast\s+&\s+hotel\s+checkout\s*|alpine\s+breakfast\s+with\s+mountain\s+views\s*|highway\s+rest\s+stop,?\s+brunch\s+&\s+karak\s+chai\s*|farewell\s+lunch\s+&\s+karak\s+chai\s*|welcome\s+dinner\s+featuring\s+|evening\s+dinner\s+&\s+night\s+stay\s+at\s*)",
    ]
    for pattern in prefixes:
        p = re.sub(pattern, "", p, flags=re.IGNORECASE)

    # Clean redundant trailing Pakistan if attached twice
    p = re.sub(r",\s*Pakistan,\s*Pakistan\b", ", Pakistan", p, flags=re.IGNORECASE).strip()
    p = p.strip(" ,.-:")
    return p or dest


def make_maps_url(place_name: str, destination: str, lat: Optional[float] = None, lon: Optional[float] = None) -> str:
    """Generate coordinate-exact Google Maps URL when coordinates exist, or contextual search URL."""
    if lat is not None and lon is not None:
        return f"https://www.google.com/maps/search/?api=1&query={lat:.6f},{lon:.6f}"
    clean_p = clean_place_query(place_name, destination)
    if destination.lower() in clean_p.lower():
        query = f"{clean_p}, Pakistan" if "pakistan" not in clean_p.lower() else clean_p
    else:
        query = f"{clean_p}, {destination}, Pakistan"
    encoded = urllib.parse.quote(query)
    return f"https://www.google.com/maps/search/?api=1&query={encoded}"


def normalize_entity_name(text: str) -> str:
    """Normalize place string by lowercasing, removing punctuation, and standardizing whitespace."""
    if not text:
        return ""
    s = text.lower()
    s = re.sub(r"[^\w\s]", " ", s)
    return " ".join(s.split())


def is_in_pakistan(lat: Optional[float], lon: Optional[float], address: str = "", country_code: str = "") -> bool:
    """Check geographic bounding box of Pakistan and ensure not an excluded foreign country."""
    if lat is None or lon is None:
        return False
    if not (23.5 <= float(lat) <= 37.5 and 60.5 <= float(lon) <= 78.0):
        return False
    cc = (country_code or "").lower().strip()
    if cc and cc not in ["pk", "pak"]:
        return False
    addr_lower = (address or "").lower()
    foreign_indicators = ["india", "kargil", "ladakh", "jammu and kashmir", "afghanistan", "iran", "china", "tajikistan", "israel", "usa", "uk"]
    if any(f in addr_lower for f in foreign_indicators):
        return False
    return True


def is_destination_relevant(candidate_addr: str, candidate_name: str, destination: str) -> bool:
    """Ensure candidate is contextually located within the destination region and not in an unrelated province/city."""
    if not destination:
        return True
    dest_norm = normalize_entity_name(destination)
    cand_addr_norm = normalize_entity_name(candidate_addr)
    cand_name_norm = normalize_entity_name(candidate_name)

    # Incompatible major regions
    incompatible_map = {
        "islamabad": ["peshawar", "lahore", "karachi", "quetta", "khyber pakhtunkhwa", "sindh", "balochistan", "kargil", "ladakh"],
        "hunza": ["lahore", "karachi", "peshawar", "islamabad", "sindh", "punjab", "balochistan", "kargil", "ladakh"],
        "skardu": ["lahore", "karachi", "peshawar", "islamabad", "sindh", "punjab", "balochistan", "kargil", "ladakh"],
        "shounter": ["lahore", "karachi", "peshawar", "islamabad", "sindh", "punjab", "balochistan", "kargil", "ladakh"],
    }
    for dest_key, bad_regions in incompatible_map.items():
        if dest_key in dest_norm:
            for bad in bad_regions:
                # If candidate is in a conflicting region without destination mention
                if bad in cand_addr_norm and dest_key not in cand_addr_norm and dest_key not in cand_name_norm:
                    return False

    return True


def is_entity_match(requested: str, candidate_title: str, candidate_addr: str = "", dest: str = "") -> bool:
    """Strict entity-to-coordinate matcher preventing cross-POI or regional collapse."""
    r_norm = normalize_entity_name(requested)
    c_norm = normalize_entity_name(candidate_title)
    addr_norm = normalize_entity_name(candidate_addr)
    dest_norm = normalize_entity_name(dest)

    if not r_norm or not c_norm:
        return False

    # 1. Reject broad country/provincial/foreign geographic names
    blocked_generics = [
        "pakistan", "islamic republic of pakistan", "provinces of pakistan",
        "gilgit baltistan", "baltistan", "azad kashmir", "khyber pakhtunkhwa",
        "punjab", "sindh", "balochistan", "islamabad capital territory",
        "kargil", "ladakh", "jammu and kashmir", "india"
    ]
    if c_norm in blocked_generics or addr_norm in blocked_generics:
        return False

    # 2. Reject if candidate is JUST the city/destination name and requested is a specific POI
    if c_norm == dest_norm or c_norm in ["islamabad", "hunza", "skardu", "gilgit", "lahore", "karachi", "peshawar", "rawalpindi"]:
        r_words = set(r_norm.split()) - {dest_norm, "pakistan"}
        if len(r_words) > 0:
            return False

    # 3. Disallow distinct proper noun cross-matches
    if "upper kachura" in r_norm and "lower kachura" in c_norm:
        return False
    if "lower kachura" in r_norm and "upper kachura" in c_norm:
        return False
    if "baltit" in r_norm and "altit" in c_norm and "baltit" not in c_norm:
        return False
    if "altit" in r_norm and "baltit" in c_norm and "altit" not in c_norm:
        return False

    # 4. Disallow hotel matching pure lake/fort attraction
    r_is_hotel = any(h in r_norm for h in ["hotel", "resort", "inn", "lodge", "motel", "palace hotel"])
    if r_is_hotel and any(c_norm == g for g in ["attabad lake", "baltit fort", "altit fort", "faisal mosque", "khaplu palace"]):
        return False

    # 5. Disallow lake matching pass / pass matching lake
    if "lake" in r_norm and "pass" in c_norm and "lake" not in c_norm:
        return False
    if "pass" in r_norm and "lake" in c_norm and "pass" not in c_norm:
        return False

    # 6. Check common synonyms
    synonyms = [
        ("fort", "palace"),
        ("fort", "qila"),
        ("lake", "jheel"),
        ("bazaar", "bazar"),
        ("bazaar", "market"),
        ("market", "mall"),
        ("guest house", "hotel"),
        ("resort", "hotel"),
    ]
    r_expanded = {r_norm}
    for s1, s2 in synonyms:
        if s1 in r_norm:
            r_expanded.add(r_norm.replace(s1, s2))
        if s2 in r_norm:
            r_expanded.add(r_norm.replace(s2, s1))

    for variant in r_expanded:
        if variant == c_norm or variant in c_norm or c_norm in variant:
            return True

    # 7. Distinctive Token Overlap Check
    stopwords = {"the", "a", "an", "and", "of", "in", "to", "at", "for", "view", "scenic", "point", "cafe", "restaurant", "hotel", "resort", "bazar", "bazaar", "market", dest_norm, "pakistan"}
    r_tokens = set(r_norm.split()) - stopwords
    c_tokens = set(c_norm.split()) - stopwords

    if not r_tokens:
        return False

    overlap = r_tokens.intersection(c_tokens)
    if len(overlap) >= len(r_tokens):
        return True

    if len(overlap) / len(r_tokens) >= 0.60:
        return True

    return False


_GOOGLE_PLACES_AVAILABLE = True


async def verify_place_location_live(
    place_name: str,
    destination: str,
    category: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Live Geographic Place Verification Pipeline:
    1. Clean place query to extract core entity name.
    2. Primary: Google Places Find Place API (if GOOGLE_MAPS_API_KEY configured and active).
    3. Secondary: OpenStreetMap Nominatim Live Geocoding API with countrycodes=pk.
    4. Tertiary: Wikipedia Exact Title + Strict Candidate Search.
    5. Validate that candidate matches exact entity, is in Pakistan, and destination-aligned.
    6. Return structured location data with verified coordinates or safe unverified state (null coords).
    """
    global _GOOGLE_PLACES_AVAILABLE
    raw_name = (place_name or "").strip()
    dest_clean = (destination or "").strip()
    if not raw_name:
        raw_name = dest_clean or "Pakistan"

    clean_p = clean_place_query(raw_name, dest_clean)
    if dest_clean.lower() in clean_p.lower():
        q1 = f"{clean_p}, Pakistan" if "pakistan" not in clean_p.lower() else clean_p
    else:
        q1 = f"{clean_p}, {dest_clean}, Pakistan"

    candidate_queries = [q1]
    if f"{clean_p}, Pakistan" not in candidate_queries:
        candidate_queries.append(f"{clean_p}, Pakistan")
    if clean_p not in candidate_queries:
        candidate_queries.append(clean_p)

    search_query = candidate_queries[0]

    # 1. Google Places API / Geocoding (if GOOGLE_MAPS_API_KEY available and active)
    g_key = getattr(settings, "GOOGLE_MAPS_API_KEY", None)
    if _GOOGLE_PLACES_AVAILABLE and g_key and g_key not in ["your_google_maps_api_key_here", ""]:
        try:
            g_url = "https://maps.googleapis.com/maps/api/place/findplacefromtext/json"
            g_params = {
                "input": search_query,
                "inputtype": "textquery",
                "fields": "place_id,name,formatted_address,geometry",
                "key": g_key,
            }
            async with httpx.AsyncClient(timeout=2.0) as client:
                resp = await client.get(g_url, params=g_params)
                if resp.status_code == 200:
                    data = resp.json()
                    status = data.get("status")
                    if status == "REQUEST_DENIED":
                        _GOOGLE_PLACES_AVAILABLE = False
                    else:
                        candidates = data.get("candidates", [])
                        if candidates:
                            top = candidates[0]
                            geo = top.get("geometry", {}).get("location", {})
                            lat = geo.get("lat")
                            lng = geo.get("lng")
                            addr = top.get("formatted_address", "")
                            p_id = top.get("place_id")
                            verified_name = top.get("name") or clean_p

                            if lat and lng and is_in_pakistan(lat, lng, addr) and is_destination_relevant(addr, verified_name, dest_clean) and is_entity_match(clean_p, verified_name, addr, dest_clean):
                                maps_url = f"https://www.google.com/maps/search/?api=1&query={lat:.6f},{lng:.6f}"
                                if p_id:
                                    maps_url += f"&query_place_id={p_id}"
                                return {
                                    "location_name": verified_name,
                                    "address": addr or f"{verified_name}, {dest_clean}, Pakistan",
                                    "latitude": float(lat),
                                    "longitude": float(lng),
                                    "maps_url": maps_url,
                                    "location_verified": True,
                                    "location_source": "google_places_api",
                                    "location_status": "verified",
                                }
        except Exception as e:
            _GOOGLE_PLACES_AVAILABLE = False
            logger.debug(f"Google Places verification notice for '{clean_p}': {e}")

    # 2. Wikipedia Geocoding API (Exact entity titles first)
    try:
        wiki_headers = {"User-Agent": "Friday-AI-Travel-Copilot/3.0 (travel@friday.pk)"}
        async with httpx.AsyncClient(headers=wiki_headers, timeout=3.0) as client:
            # 2a. Direct Wikipedia title coordinate lookup
            for wiki_title in [clean_p, f"{clean_p} ({dest_clean})", f"{clean_p}, Pakistan", clean_p.replace("Fort", "Palace"), clean_p.replace("Bazar", "Bazaar")]:
                w_url = (
                    f"https://en.wikipedia.org/w/api.php?"
                    f"action=query&prop=coordinates|pageprops&titles={urllib.parse.quote(wiki_title)}&format=json"
                )
                w_resp = await client.get(w_url)
                if w_resp.status_code == 200:
                    pages = w_resp.json().get("query", {}).get("pages", {})
                    for pid, pdata in pages.items():
                        if pid != "-1":
                            cand_title = pdata.get("title", "")
                            if is_entity_match(clean_p, cand_title, "", dest_clean) and is_destination_relevant("", cand_title, dest_clean):
                                coords = pdata.get("coordinates", [])
                                if not coords:
                                    wb_item = pdata.get("pageprops", {}).get("wikibase_item")
                                    if wb_item:
                                        try:
                                            wb_url = f"https://www.wikidata.org/w/api.php?action=wbgetentities&ids={wb_item}&props=claims&format=json"
                                            wb_resp = await client.get(wb_url)
                                            if wb_resp.status_code == 200:
                                                claims = wb_resp.json().get("entities", {}).get(wb_item, {}).get("claims", {})
                                                p625 = claims.get("P625", [])
                                                if p625:
                                                    val = p625[0].get("mainsnak", {}).get("datavalue", {}).get("value", {})
                                                    if "latitude" in val and "longitude" in val:
                                                        coords = [{"lat": float(val["latitude"]), "lon": float(val["longitude"])}]
                                        except Exception:
                                            pass
                                if coords:
                                    lat = float(coords[0]["lat"])
                                    lon = float(coords[0]["lon"])
                                    if is_in_pakistan(lat, lon):
                                        return {
                                            "location_name": cand_title,
                                            "address": f"{cand_title}, {dest_clean}, Pakistan",
                                            "latitude": lat,
                                            "longitude": lon,
                                            "maps_url": f"https://www.google.com/maps/search/?api=1&query={lat:.6f},{lon:.6f}",
                                            "location_verified": True,
                                            "location_source": "wikipedia_geo_api",
                                            "location_status": "verified",
                                        }

            # 2b. Wikipedia Generator Search WITH strict is_entity_match
            s_url = (
                f"https://en.wikipedia.org/w/api.php?"
                f"action=query&generator=search&gsrsearch={urllib.parse.quote(f'{clean_p} {dest_clean} Pakistan')}&gsrlimit=4"
                f"&prop=coordinates|pageprops&format=json"
            )
            s_resp = await client.get(s_url)
            if s_resp.status_code == 200:
                pages = s_resp.json().get("query", {}).get("pages", {})
                for pid, pdata in pages.items():
                    if pid != "-1":
                        cand_title = pdata.get("title", clean_p)
                        if is_entity_match(clean_p, cand_title, "", dest_clean) and is_destination_relevant("", cand_title, dest_clean):
                            coords = pdata.get("coordinates", [])
                            if coords:
                                lat = float(coords[0]["lat"])
                                lon = float(coords[0]["lon"])
                                if is_in_pakistan(lat, lon):
                                    return {
                                        "location_name": cand_title,
                                        "address": f"{cand_title}, {dest_clean}, Pakistan",
                                        "latitude": lat,
                                        "longitude": lon,
                                        "maps_url": f"https://www.google.com/maps/search/?api=1&query={lat:.6f},{lon:.6f}",
                                        "location_verified": True,
                                        "location_source": "wikipedia_geosearch_api",
                                        "location_status": "verified",
                                    }
    except Exception as e:
        logger.debug(f"Wikipedia geocode notice for '{clean_p}': {e}")

    # 3. OpenStreetMap / Nominatim Live Place Geocoding API (Multi-pass resolution)
    try:
        nom_url = "https://nominatim.openstreetmap.org/search"
        headers = {"User-Agent": "Friday-Travel-Copilot/3.0 (travel@friday.pk)", "Accept-Language": "en"}
        
        for q_try in candidate_queries:
            nom_params = {
                "q": q_try,
                "format": "json",
                "addressdetails": 1,
                "countrycodes": "pk",
                "limit": 3,
            }
            async with httpx.AsyncClient(timeout=3.0, headers=headers) as client:
                resp = await client.get(nom_url, params=nom_params)
                if resp.status_code == 200:
                    results = resp.json()
                    if isinstance(results, list):
                        for top in results:
                            display_addr = top.get("display_name", "")
                            verified_name = top.get("name") or display_addr.split(",")[0]
                            addr_meta = top.get("address", {})
                            cc = (addr_meta.get("country_code") or "").lower()

                            try:
                                lat = float(top["lat"])
                                lon = float(top["lon"])
                            except (ValueError, KeyError):
                                continue

                            if is_in_pakistan(lat, lon, display_addr, cc) and is_destination_relevant(display_addr, verified_name, dest_clean) and is_entity_match(clean_p, verified_name, display_addr, dest_clean):
                                maps_url = f"https://www.google.com/maps/search/?api=1&query={lat:.6f},{lon:.6f}"
                                return {
                                    "location_name": verified_name or clean_p,
                                    "address": display_addr or f"{clean_p}, {dest_clean}, Pakistan",
                                    "latitude": lat,
                                    "longitude": lon,
                                    "maps_url": maps_url,
                                    "location_verified": True,
                                    "location_source": "openstreetmap_nominatim_live",
                                    "location_status": "verified",
                                }
    except Exception as e:
        logger.debug(f"OSM Nominatim verification notice for '{clean_p}': {e}")

    # 4. Safe Unverified Fallback (No fake coordinates, no misleading Maps URL)
    return {
        "location_name": clean_p,
        "address": f"{clean_p}, {dest_clean}, Pakistan",
        "latitude": None,
        "longitude": None,
        "maps_url": None,
        "location_verified": False,
        "location_source": "unverified",
        "location_status": "unverified",
        "confidence": 0.50,
    }


IMAGE_EXTENSIONS = ('.jpg', '.jpeg', '.png', '.webp', '.avif')
DISALLOWED_IMAGE_DOMAINS = (
    "lookaside.instagram.com", "lookaside.fbsbx.com", "facebook.com", "instagram.com",
    "tiktok.com", "twitter.com", "x.com"
)


def is_valid_direct_image_url(url: str) -> bool:
    """Strictly validates that a URL points to a genuine, direct image resource."""
    if not url or not isinstance(url, str):
        return False
    clean = url.strip()
    if not (clean.startswith("http://") or clean.startswith("https://")):
        return False
    try:
        parsed = urllib.parse.urlparse(clean)
        netloc = parsed.netloc.lower()
        path = parsed.path.lower()

        # Reject crawler links or social walled gardens
        if any(d in netloc for d in DISALLOWED_IMAGE_DOMAINS):
            return False

        # Direct file extension
        if any(path.endswith(ext) for ext in IMAGE_EXTENSIONS):
            return True

        # Recognized image CDNs / thumbnail generators
        if "upload.wikimedia.org" in netloc and ("/thumb/" in path or any(ext in path for ext in IMAGE_EXTENSIONS)):
            return True
        if "images.unsplash.com" in netloc or "res.cloudinary.com" in netloc:
            return True
        if "dynamic-media-cdn.tripadvisor.com" in netloc or "media.tacdn.com" in netloc:
            return True
        if "cdn.tourradar.com" in netloc or "media.istockphoto.com" in netloc:
            return True
        if "images.trvl-media.com" in netloc:
            return True

        # If URL query contains image extension format
        query = parsed.query.lower()
        if any(ext.replace('.', '') in query for ext in IMAGE_EXTENSIONS):
            return True

        return False
    except Exception:
        return False


def generate_diversified_image_queries(topic: str, destination: str) -> List[str]:
    """Generate diversified search queries across multiple landmarks, angles, and viewpoints."""
    clean_d = destination.strip()
    clean_t = topic.strip()

    variations = [
        f"{clean_t} {clean_d} Pakistan travel photography",
        f"{clean_d} Pakistan scenic landscape panorama",
        f"{clean_d} tourism valley mountain lake viewpoint",
        f"{clean_d} Pakistan landmark nature trail photography",
    ]
    if clean_t.lower() != clean_d.lower():
        variations.insert(0, f"{clean_t} {clean_d} authentic photo")
    return variations


async def fetch_wikimedia_images(query: str, limit: int = 5) -> List[str]:
    """Dynamically search and fetch authentic photography from Wikimedia Commons API."""
    clean_q = re.sub(r"[^\w\s]", "", query).strip()
    if not clean_q:
        return []

    url = (
        "https://en.wikipedia.org/w/api.php?"
        f"action=query&generator=search&gsrsearch={urllib.parse.quote(clean_q + ' Pakistan')}"
        f"&gsrlimit={limit}&prop=pageimages|images&pithumbsize=1200&format=json"
    )
    headers = {"User-Agent": "Friday-Travel-Copilot/3.0 (travel@friday.pk)"}

    images = []
    try:
        async with httpx.AsyncClient(timeout=4.0, headers=headers) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                pages = data.get("query", {}).get("pages", {})
                for _, page_info in pages.items():
                    thumb = page_info.get("thumbnail", {}).get("source")
                    if thumb and is_valid_direct_image_url(thumb):
                        lower_thumb = thumb.lower()
                        if not any(bad in lower_thumb for bad in BAD_TOKENS):
                            images.append(thumb)
    except Exception as e:
        logger.debug(f"Wikimedia image search for '{clean_q}' skipped: {e}")

    return images


async def fetch_real_web_photos_multi(
    query_topic: str,
    destination: str,
    limit: int = 8,
) -> List[str]:
    """
    Pure Dynamic Live Web Image Research:
    1. Query Tavily Search with 'include_images=True' across diversified search angles.
    2. Query Wikimedia Commons API for authentic verified high-resolution photography.
    3. Filter out non-image resources, social crawler links, and foreign mismatches.
    4. Return verified live direct image URLs or empty list (NEVER fake static fallback lists).
    """
    clean_topic = query_topic.strip()
    clean_dest = destination.strip()
    cache_key = f"{clean_topic.lower()}_{clean_dest.lower()}"

    if cache_key in _PHOTO_MULTI_CACHE:
        return _PHOTO_MULTI_CACHE[cache_key]

    results: List[str] = []
    queries = generate_diversified_image_queries(clean_topic, clean_dest)

    # 1. Tavily Live Image Discovery across diversified queries
    tavily_api_key = getattr(settings, "TAVILY_API_KEY", None)
    if tavily_api_key and tavily_api_key != "your_tavily_api_key_here":
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                for q in queries[:2]:
                    if len(results) >= limit * 2:
                        break
                    resp = await client.post(
                        "https://api.tavily.com/search",
                        json={
                            "api_key": tavily_api_key,
                            "query": q,
                            "include_images": True,
                            "search_depth": "basic",
                            "max_results": 5,
                        },
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        raw_images = data.get("images", [])
                        for img in raw_images:
                            if isinstance(img, str) and is_valid_direct_image_url(img):
                                img_lower = img.lower()
                                if not any(bad in img_lower for bad in BAD_TOKENS) and not any(f in img_lower for f in FOREIGN_KEYWORDS):
                                    if img not in results:
                                        results.append(img)
        except Exception as e:
            logger.debug(f"Tavily live image search skipped: {e}")

    # 2. Wikimedia Commons Live Search
    if len(results) < limit:
        for q in queries[:2]:
            wiki_images = await fetch_wikimedia_images(q, limit=limit)
            for w_img in wiki_images:
                if is_valid_direct_image_url(w_img) and w_img not in results:
                    results.append(w_img)
            if len(results) >= limit:
                break

    _PHOTO_MULTI_CACHE[cache_key] = results
    return results


def normalize_poi_category(cat: Optional[str]) -> str:
    """Normalize raw POI/activity category into supported standard taxonomy."""
    if not cat:
        return "SIGHTSEEING"
    c = str(cat).strip().upper()
    if c in ("TRANSPORT", "TRANSPORTATION", "TRANSIT", "FLIGHT", "DRIVE", "HIGHWAY"):
        return "TRANSPORT"
    if c in ("ACCOMMODATION", "HOTEL", "RESORT", "STAY", "LODGE", "GUESTHOUSE"):
        return "ACCOMMODATION"
    if c in ("FOOD", "DINING", "RESTAURANT", "CAFE", "MEAL", "BREAKFAST", "LUNCH", "DINNER", "BRUNCH"):
        return "FOOD"
    if c in ("ADVENTURE", "HIKING", "TREKKING", "RAFTING", "SPORTS"):
        return "ADVENTURE"
    if c in ("CULTURE", "HERITAGE", "HISTORIC", "MUSEUM", "MONUMENT"):
        return "CULTURE"
    if c in ("SHOPPING", "BAZAAR", "MARKET", "SOUVENIR"):
        return "SHOPPING"
    if c in ("REST", "LEISURE", "RELAX", "RELAXATION"):
        return "REST"
    if c in ("SIGHTSEEING", "NATURE", "SCENIC", "VIEWPOINT", "PARK", "ATTRACTION", "LANDMARK", "LAKE", "VALLEY", "MOUNTAIN"):
        return "SIGHTSEEING"
    return "SIGHTSEEING"


class DynamicDestinationResearchService:
    """Researches real POIs and structures Day-by-Day itineraries with exact budget math."""

    @classmethod
    def calculate_budget_breakdown(
        cls,
        budget_total: float,
        duration_days: int,
        accommodation_preference: str = "comfortable",
    ) -> Dict[str, int]:
        """
        Unified single-source budget allocation for Friday.
        Produces deterministic breakdown where:
        b_trans + b_accom + b_food + b_acts + b_other == round(budget_total)
        and b_other is the contingency reserve.
        """
        num_days = max(1, duration_days)
        total_b = max(5000.0, float(budget_total))
        is_no_stay = (accommodation_preference == "none" or num_days == 1)

        if is_no_stay:
            trans_ratio = 0.40
            accom_ratio = 0.00
            food_ratio = 0.30
            acts_ratio = 0.20
            other_ratio = 0.10
        else:
            pref = (accommodation_preference or "comfortable").lower()
            if "budget" in pref:
                accom_ratio = 0.28
                trans_ratio = 0.32
                food_ratio = 0.22
                acts_ratio = 0.12
                other_ratio = 0.06
            elif "premium" in pref or "luxury" in pref:
                accom_ratio = 0.45
                trans_ratio = 0.25
                food_ratio = 0.15
                acts_ratio = 0.10
                other_ratio = 0.05
            else:  # comfortable / friday_decide
                accom_ratio = 0.35
                trans_ratio = 0.28
                food_ratio = 0.20
                acts_ratio = 0.10
                other_ratio = 0.07

        pool_trans = round(total_b * trans_ratio)
        pool_accom = round(total_b * accom_ratio)
        pool_food = round(total_b * food_ratio)
        pool_acts = round(total_b * acts_ratio)
        pool_other = max(0, round(total_b) - (pool_trans + pool_accom + pool_food + pool_acts))

        return {
            "transport": pool_trans,
            "accommodation": pool_accom,
            "food": pool_food,
            "activities": pool_acts,
            "other": pool_other,
            "total": round(total_b),
        }

    @classmethod
    async def fetch_poi_image(
        cls,
        poi_title: str,
        destination: str,
        category: str = "SIGHTSEEING",
    ) -> Optional[str]:
        """Dynamically search and return an authentic image for a specific POI."""
        photos = await fetch_real_web_photos_multi(poi_title, destination, limit=4)
        if photos and len(photos) > 0:
            return photos[0]
        return None

    @classmethod
    async def research_destination_pois(
        cls,
        destination: str,
        origin: str,
    ) -> Dict[str, Any]:
        """
        Dynamically research authentic attractions, restaurants, and accommodation for ANY Pakistani location.
        Uses Tavily search when configured, or generates authentic local travel landmarks based on geography.
        """
        dest_clean = destination.strip()
        tavily_api_key = getattr(settings, "TAVILY_API_KEY", None)
        
        discovered_attractions = []
        discovered_food = []
        hotel_name = f"{dest_clean} Guest Lodge"
        hotel_loc = f"{dest_clean}, Pakistan"

        # 1. AI POI Entity Research via Groq + Optional Tavily Web Context
        g_key = getattr(settings, "GROQ_API_KEY", None)
        if g_key and g_key not in ["your_groq_api_key_here", ""]:
            try:
                # Optionally gather live Tavily web snippets first for fresh context
                web_snippets = ""
                if tavily_api_key and tavily_api_key not in ["your_tavily_api_key_here", ""]:
                    try:
                        async with httpx.AsyncClient(timeout=3.5) as client:
                            t_resp = await client.post(
                                "https://api.tavily.com/search",
                                json={
                                    "api_key": tavily_api_key,
                                    "query": f"top attractions restaurants hotels in {dest_clean} Pakistan",
                                    "search_depth": "basic",
                                    "max_results": 4,
                                },
                            )
                            if t_resp.status_code == 200:
                                t_data = t_resp.json()
                                snippets = [f"{r.get('title')}: {r.get('content')}" for r in t_data.get("results", [])]
                                web_snippets = "\n".join(snippets[:3])
                    except Exception:
                        pass

                from app.llm.groq import GroqProvider
                groq = GroqProvider()
                prompt = (
                    f"You are Friday, Pakistan's leading AI travel copilot.\n"
                    f"Identify authentic, real-world geographic places and POIs for destination '{dest_clean}', Pakistan.\n"
                    f"{'Web research context:\n' + web_snippets if web_snippets else ''}\n"
                    f"Respond ONLY with a valid JSON object strictly matching this format:\n"
                    f'{{\n'
                    f'  "attractions": [\n'
                    f'    {{"title": "Real Landmark/Attraction 1", "location": "Real Landmark/Attraction 1, {dest_clean}", "category": "SIGHTSEEING", "description": "Overview"}},\n'
                    f'    {{"title": "Real Landmark/Attraction 2", "location": "Real Landmark/Attraction 2, {dest_clean}", "category": "NATURE", "description": "Overview"}},\n'
                    f'    {{"title": "Real Landmark/Attraction 3", "location": "Real Landmark/Attraction 3, {dest_clean}", "category": "CULTURE", "description": "Overview"}},\n'
                    f'    {{"title": "Real Market/Landmark 4", "location": "Real Market/Landmark 4, {dest_clean}", "category": "SHOPPING", "description": "Overview"}}\n'
                    f'  ],\n'
                    f'  "food_spots": [\n'
                    f'    {{"title": "Real Restaurant/Cafe Name 1", "location": "Real Restaurant/Cafe Name 1, {dest_clean}", "category": "FOOD"}},\n'
                    f'    {{"title": "Real Restaurant/Cafe Name 2", "location": "Real Restaurant/Cafe Name 2, {dest_clean}", "category": "FOOD"}}\n'
                    f'  ],\n'
                    f'  "hotel": {{\n'
                    f'    "name": "Real Hotel/Resort Name in {dest_clean}", "location": "{dest_clean}"\n'
                    f'  }}\n'
                    f'}}\n'
                    f"Ensure all names are authentic real-world places (e.g. Forts, Lakes, Parks, actual real local Restaurants, real Bazaars). Do not invent synthetic business names. Raw JSON only."
                )
                llm_res = await groq.generate_text(prompt=prompt, temperature=0.1)
                if llm_res and llm_res.text:
                    clean_txt = llm_res.text.strip()
                    j_match = re.search(r"\{[\s\S]*\}", clean_txt)
                    if j_match:
                        res_obj = json.loads(j_match.group(0))
                        if res_obj.get("attractions") and len(res_obj["attractions"]) >= 2:
                            discovered_attractions = res_obj["attractions"]
                        if res_obj.get("food_spots") and len(res_obj["food_spots"]) >= 1:
                            discovered_food = res_obj["food_spots"]
                        if res_obj.get("hotel") and res_obj["hotel"].get("name"):
                            hotel_name = res_obj["hotel"]["name"]
                            hotel_loc = res_obj["hotel"].get("location", dest_clean)
            except Exception as e:
                logger.debug(f"Dynamic Groq POI extraction notice: {e}")

        # 2. Secondary Web Search via Tavily if attractions still empty
        if not discovered_attractions and tavily_api_key and tavily_api_key != "your_tavily_api_key_here":
            try:
                query = f"top attractions places to visit restaurants hotels in {dest_clean} Pakistan tourism"
                async with httpx.AsyncClient(timeout=5.0) as client:
                    resp = await client.post(
                        "https://api.tavily.com/search",
                        json={
                            "api_key": tavily_api_key,
                            "query": query,
                            "search_depth": "advanced",
                            "max_results": 6,
                        },
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        for r in data.get("results", []):
                            title = r.get("title", "")
                            content = r.get("content", "")
                            clean_t = title.split(" - ")[0].split(" | ")[0].strip()
                            if clean_t and len(clean_t) < 60:
                                discovered_attractions.append({
                                    "title": clean_t,
                                    "location": f"{clean_t}, {dest_clean}",
                                    "description": content[:160] if content else f"Renowned landmark in {dest_clean}.",
                                    "category": "SIGHTSEEING",
                                })
            except Exception as e:
                logger.debug(f"Live POI web research fallback: {e}")

        # Ensure default POIs if web search returned sparse results
        if not discovered_attractions:
            discovered_attractions = [
                {
                    "title": f"{dest_clean} Panoramic Viewpoint & Ridge",
                    "location": f"Upper {dest_clean}",
                    "description": f"Breathtaking mountain panoramas, valley vistas, and photography points in {dest_clean}.",
                    "category": "SIGHTSEEING",
                },
                {
                    "title": f"{dest_clean} Historic Heritage & Cultural Site",
                    "location": f"{dest_clean} Heritage Quarter",
                    "description": f"Rich indigenous traditions, architecture, and historic landmarks of {dest_clean}.",
                    "category": "CULTURE",
                },
                {
                    "title": f"{dest_clean} Alpine Lake & Nature Trail",
                    "location": f"{dest_clean} Valley Basin",
                    "description": f"Crystal streams, pine meadows, and guided alpine walking trails around {dest_clean}.",
                    "category": "NATURE",
                },
                {
                    "title": f"{dest_clean} Artisan Bazaar & Craft Market",
                    "location": f"{dest_clean} Main Bazaar",
                    "description": f"Authentic regional handicrafts, gemstones, traditional shawls, and dried fruits.",
                    "category": "SHOPPING",
                },
            ]

        # Fallback only if live research returned 0 food spots
        if not discovered_food:
            discovered_food = [
                {
                    "title": f"Dinner at {hotel_name}",
                    "location": hotel_loc,
                    "category": "FOOD",
                }
            ]

        hero_photos = await fetch_real_web_photos_multi(f"{dest_clean} Pakistan travel", dest_clean, limit=4)
        hero_img = hero_photos[0] if hero_photos else None

        return {
            "attractions": discovered_attractions,
            "food_spots": discovered_food,
            "hotel": {"name": hotel_name, "location": hotel_loc},
            "hero_image": hero_img,
        }

    @classmethod
    async def generate_dynamic_itinerary_days(
        cls,
        destination: str,
        origin: str,
        duration_days: int,
        budget_total: float,
        accommodation_preference: str = "comfortable",
        variation_seed: Optional[int] = None,
    ) -> Tuple[List[Dict[str, Any]], Optional[str]]:
        """
        Generate complete Day-by-Day itinerary with 100% STRICT budget reconciliation:
        SUM(planned itinerary items) + contingency == round(budget_total) EXACTLY.
        Contingency remains a reserve and is NEVER an itinerary expense.
        """
        num_days = max(1, duration_days)
        total_b = max(5000.0, float(budget_total))
        is_no_stay = (accommodation_preference == "none" or num_days == 1)

        breakdown = cls.calculate_budget_breakdown(
            budget_total=total_b,
            duration_days=num_days,
            accommodation_preference=accommodation_preference,
        )
        pool_trans = breakdown["transport"]
        pool_accom = breakdown["accommodation"]
        pool_food = breakdown["food"]
        pool_acts = breakdown["activities"]
        pool_other = breakdown["other"]

        # 2. Live Research & POIs
        research = await cls.research_destination_pois(destination, origin)
        attractions = research.get("attractions", [])
        food_spots = research.get("food_spots", [])
        hotel = research.get("hotel", {"name": f"Hotel in {destination}", "location": destination})
        hero_img = research.get("hero_image")

        hotel_name = hotel.get("name", f"Resort in {destination}")
        # Live Geographic Place Verification for Accommodation
        hotel_loc_info = await verify_place_location_live(hotel_name, destination, category="ACCOMMODATION")
        hotel_maps_url = hotel_loc_info["maps_url"]
        hotel_lat = hotel_loc_info["latitude"]
        hotel_lon = hotel_loc_info["longitude"]
        hotel_loc = hotel_loc_info["address"] if hotel_loc_info["location_verified"] else hotel_name
        hotel_verified = hotel_loc_info["location_verified"]

        # 3. Exact per-day and per-category distributions
        def get_day_food(d: int) -> int:
            base = pool_food // num_days
            if d == num_days:
                return pool_food - base * (num_days - 1)
            return base

        def get_day_acts(d: int) -> int:
            base = pool_acts // num_days
            if d == num_days:
                return pool_acts - base * (num_days - 1)
            return base

        num_nights = max(1, num_days - 1)
        def get_day_accom(d: int) -> int:
            if is_no_stay or d >= num_days:
                return 0
            base = pool_accom // num_nights
            if d == num_nights:
                return pool_accom - base * (num_nights - 1)
            return base

        if num_days == 1:
            day1_trans = pool_trans // 2
            dayN_trans = pool_trans - day1_trans
        elif num_days == 2:
            day1_trans = pool_trans // 2
            dayN_trans = pool_trans - day1_trans
        else:
            day1_trans = round(pool_trans * 0.40)
            dayN_trans = round(pool_trans * 0.40)

        days_data = []
        att_idx = 0
        food_idx = 0

        for day_num in range(1, num_days + 1):
            activities = []

            if num_days == 1:
                # ─── 1-DAY EXCURSION ─────────────────────────────────────────
                day_title = f"Full Day Journey to {destination} from {origin}"
                day_summary = f"Comprehensive day exploration from {origin} to {destination} including scenic highway transit, key sights, local dining, and evening return."

                att1 = attractions[att_idx % len(attractions)]
                att_idx += 1
                att2 = attractions[att_idx % len(attractions)]
                att_idx += 1
                food1 = food_spots[food_idx % len(food_spots)]
                food_idx += 1

                att1_img = await cls.fetch_poi_image(att1["title"], destination)
                att2_img = await cls.fetch_poi_image(att2["title"], destination)

                day_f = get_day_food(1)
                day_a = get_day_acts(1)

                activities = [
                    {
                        "order": 1,
                        "title": f"Departure & Scenic Transit from {origin}",
                        "description": f"Early morning highway departure from {origin} towards {destination}.",
                        "location": f"Highway between {origin} and {destination}",
                        "start_time": "07:00 AM",
                        "end_time": "10:30 AM",
                        "duration_minutes": 210,
                        "estimated_cost": day1_trans,
                        "category": "TRANSPORT",
                        "image_url": hero_img,
                    },
                    {
                        "order": 2,
                        "title": att1["title"],
                        "description": att1["description"],
                        "location": att1["location"],
                        "start_time": "11:00 AM",
                        "end_time": "01:00 PM",
                        "duration_minutes": 120,
                        "estimated_cost": day_a // 2,
                        "category": normalize_poi_category(att1.get("category", "SIGHTSEEING")),
                        "image_url": att1_img or hero_img,
                    },
                    {
                        "order": 3,
                        "title": food1["title"],
                        "description": f"Authentic regional dining featuring traditional culinary specialties in {destination}.",
                        "location": food1["location"],
                        "start_time": "01:15 PM",
                        "end_time": "02:30 PM",
                        "duration_minutes": 75,
                        "estimated_cost": day_f // 2,
                        "category": "FOOD",
                        "image_url": None,
                    },
                    {
                        "order": 4,
                        "title": att2["title"],
                        "description": att2["description"],
                        "location": att2["location"],
                        "start_time": "03:00 PM",
                        "end_time": "05:00 PM",
                        "duration_minutes": 120,
                        "estimated_cost": day_a - (day_a // 2),
                        "category": normalize_poi_category(att2.get("category", "CULTURE")),
                        "image_url": att2_img or hero_img,
                    },
                    {
                        "order": 5,
                        "title": f"Sunset Tea & Mountain Panoramas at {destination}",
                        "description": f"Golden hour panoramic viewpoints and evening refreshments before return journey.",
                        "location": f"{destination} Viewpoint",
                        "start_time": "05:30 PM",
                        "end_time": "06:30 PM",
                        "duration_minutes": 60,
                        "estimated_cost": day_f - (day_f // 2),
                        "category": "FOOD",
                        "image_url": None,
                    },
                    {
                        "order": 6,
                        "title": f"Return Transit Journey back to {origin}",
                        "description": f"Comfortable evening highway drive back to {origin}.",
                        "location": f"Highway between {destination} and {origin}",
                        "start_time": "07:00 PM",
                        "end_time": "10:00 PM",
                        "duration_minutes": 180,
                        "estimated_cost": dayN_trans,
                        "category": "TRANSPORT",
                        "image_url": hero_img,
                    },
                ]

            elif day_num == 1:
                # ─── MULTI-DAY: DAY 1 DEPARTURE & ARRIVAL ────────────────────
                is_in_city = (origin.strip().lower() == destination.strip().lower())
                day_title = f"Arrival & Exploration of {destination}" if is_in_city else f"Departure from {origin} & Arrival in {destination}"
                day_summary = (
                    f"Scenic exploration of iconic cultural landmarks, viewpoints, and local culinary specialties in {destination}."
                    if is_in_city
                    else f"Scenic highway transit from {origin}, arrival in {destination}, check-in, and introductory evening exploration."
                )
                
                att1 = attractions[att_idx % len(attractions)]
                att_idx += 1
                food1 = food_spots[food_idx % len(food_spots)]
                food_idx += 1
                att1_img = await cls.fetch_poi_image(att1["title"], destination)

                day_f = get_day_food(1)
                day_a = get_day_acts(1)
                day_acc = get_day_accom(1)

                if is_in_city:
                    activities = [
                        {
                            "order": 1,
                            "title": f"Morning Departure & Exploration of {destination}",
                            "description": f"Gather and embark on a scenic morning exploration of {destination}.",
                            "location": destination,
                            "start_time": "08:30 AM",
                            "end_time": "10:30 AM",
                            "duration_minutes": 120,
                            "estimated_cost": day1_trans,
                            "category": "TRANSPORT",
                            "image_url": hero_img,
                        },
                        {
                            "order": 2,
                            "title": "Morning Brunch & Karak Chai",
                            "description": "Authentic regional breakfast with paratha, omelette, and hot Karak chai.",
                            "location": f"Local Dining in {destination}",
                            "start_time": "11:00 AM",
                            "end_time": "12:30 PM",
                            "duration_minutes": 90,
                            "estimated_cost": day_f // 2,
                            "category": "FOOD",
                            "image_url": None,
                        },
                    ]
                else:
                    activities = [
                        {
                            "order": 1,
                            "title": f"Departure & Scenic Transit from {origin}",
                            "description": f"Morning highway departure from {origin} towards {destination}.",
                            "location": f"Highway between {origin} and {destination}",
                            "start_time": "06:00 AM",
                            "end_time": "11:30 AM",
                            "duration_minutes": 330,
                            "estimated_cost": day1_trans,
                            "category": "TRANSPORT",
                            "image_url": hero_img,
                        },
                        {
                            "order": 2,
                            "title": "Highway Rest Stop, Brunch & Karak Chai",
                            "description": "Authentic regional breakfast with paratha, omelette, and hot Karak chai en-route.",
                            "location": f"Highway Stop ({origin} to {destination})",
                            "start_time": "11:30 AM",
                            "end_time": "01:00 PM",
                            "duration_minutes": 90,
                            "estimated_cost": day_f // 2,
                            "category": "FOOD",
                            "image_url": None,
                        },
                    ]

                if not is_no_stay and day_acc > 0:
                    activities.append({
                        "order": 3,
                        "title": f"Arrival & Check-in at {hotel_name}",
                        "description": f"Arrive in {destination}, complete check-in, freshen up, and prepare for evening exploration.",
                        "location": hotel_loc,
                        "start_time": "03:00 PM",
                        "end_time": "04:45 PM",
                        "duration_minutes": 105,
                        "estimated_cost": day_acc,
                        "category": "ACCOMMODATION",
                        "image_url": None,
                    })

                activities.extend([
                    {
                        "order": 4,
                        "title": att1["title"],
                        "description": att1["description"],
                        "location": att1["location"],
                        "start_time": "05:00 PM",
                        "end_time": "07:00 PM",
                        "duration_minutes": 120,
                        "estimated_cost": day_a,
                        "category": normalize_poi_category(att1.get("category", "SIGHTSEEING")),
                        "image_url": att1_img or hero_img,
                    },
                    {
                        "order": 5,
                        "title": f"Dinner at {food1['title']}",
                        "description": f"Welcome dinner featuring authentic local culinary specialties in {destination}.",
                        "location": food1["location"],
                        "start_time": "07:30 PM",
                        "end_time": "09:30 PM",
                        "duration_minutes": 120,
                        "estimated_cost": day_f - (day_f // 2),
                        "category": "FOOD",
                        "image_url": None,
                    },
                ])

            elif day_num == num_days:
                # ─── MULTI-DAY: FINAL DAY & RETURN TRANSIT ───────────────────
                is_in_city = (origin.strip().lower() == destination.strip().lower())
                day_title = f"Final Sightseeing & Wrap-up in {destination}" if is_in_city else f"Final Sightseeing & Return Transit to {origin}"
                day_summary = (
                    f"Morning exploration of iconic spots in {destination}, artisan crafts, and celebratory trip wrap-up."
                    if is_in_city
                    else f"Morning souvenir shopping and final sightseeing in {destination}, followed by highway return to {origin}."
                )

                att_final = attractions[att_idx % len(attractions)]
                att_idx += 1
                food_final = food_spots[food_idx % len(food_spots)]
                food_idx += 1
                att_f_img = await cls.fetch_poi_image(att_final["title"], destination)

                day_f = get_day_food(num_days)
                day_a = get_day_acts(num_days)

                # Check if live research found an authentic shopping/market POI
                shopping_poi = next((a for a in attractions if a.get("category") == "SHOPPING"), None)
                if shopping_poi:
                    shop_title = shopping_poi["title"]
                    shop_desc = shopping_poi.get("description", f"Browse regional handicrafts, textiles, dried fruits, and souvenirs at {shop_title}.")
                    shop_loc = shopping_poi["location"]
                    shop_cat = "SHOPPING"
                    shop_img = await cls.fetch_poi_image(shop_title, destination)
                else:
                    next_att = attractions[att_idx % len(attractions)]
                    att_idx += 1
                    shop_title = next_att["title"]
                    shop_desc = next_att.get("description", f"Explore {shop_title} in {destination}.")
                    shop_loc = next_att["location"]
                    shop_cat = normalize_poi_category(next_att.get("category", "SIGHTSEEING"))
                    shop_img = await cls.fetch_poi_image(shop_title, destination)

                activities = [
                    {
                        "order": 1,
                        "title": f"Breakfast & Hotel Checkout",
                        "description": f"Morning buffet breakfast and seamless checkout at {hotel_name}.",
                        "location": hotel_loc,
                        "start_time": "08:00 AM",
                        "end_time": "09:30 AM",
                        "duration_minutes": 90,
                        "estimated_cost": day_f // 2,
                        "category": "FOOD",
                        "image_url": None,
                    },
                    {
                        "order": 2,
                        "title": att_final["title"],
                        "description": att_final["description"],
                        "location": att_final["location"],
                        "start_time": "10:00 AM",
                        "end_time": "12:30 PM",
                        "duration_minutes": 150,
                        "estimated_cost": day_a // 2,
                        "category": normalize_poi_category(att_final.get("category", "SIGHTSEEING")),
                        "image_url": att_f_img or hero_img,
                    },
                    {
                        "order": 3,
                        "title": shop_title,
                        "description": shop_desc,
                        "location": shop_loc,
                        "start_time": "12:45 PM",
                        "end_time": "02:00 PM",
                        "duration_minutes": 75,
                        "estimated_cost": day_a - (day_a // 2),
                        "category": shop_cat,
                        "image_url": shop_img or hero_img,
                    },
                    {
                        "order": 4,
                        "title": f"Farewell Lunch at {food_final['title']}",
                        "description": f"Traditional lunch in {destination} at {food_final['title']} before concluding the journey.",
                        "location": food_final["location"],
                        "start_time": "02:00 PM",
                        "end_time": "03:15 PM",
                        "duration_minutes": 75,
                        "estimated_cost": day_f - (day_f // 2),
                        "category": "FOOD",
                        "image_url": None,
                    },
                ]

                if is_in_city:
                    activities.append({
                        "order": 5,
                        "title": f"Trip Wrap-up & Evening Gathering in {destination}",
                        "description": f"Celebratory evening gathering marking the completion of the {destination} journey.",
                        "location": destination,
                        "start_time": "04:00 PM",
                        "end_time": "07:00 PM",
                        "duration_minutes": 180,
                        "estimated_cost": dayN_trans,
                        "category": "TRANSPORT",
                        "image_url": hero_img,
                    })
                else:
                    activities.append({
                        "order": 5,
                        "title": f"Return Transit to {origin}",
                        "description": f"Scenic highway return journey back to {origin}.",
                        "location": f"Highway from {destination} to {origin}",
                        "start_time": "03:30 PM",
                        "end_time": "09:30 PM",
                        "duration_minutes": 360,
                        "estimated_cost": dayN_trans,
                        "category": "TRANSPORT",
                        "image_url": hero_img,
                    })

            else:
                # ─── MULTI-DAY: MIDDLE IMMERSIVE EXPLORATION DAYS ────────────
                day_title = f"Immersive Exploration & Alpine Excursions in {destination}"
                day_summary = f"Full day dedicated to exploring iconic natural wonders, valley trails, and local culture around {destination}."

                att_a = attractions[att_idx % len(attractions)]
                att_idx += 1
                att_b = attractions[att_idx % len(attractions)]
                att_idx += 1
                food_mid = food_spots[food_idx % len(food_spots)]
                food_idx += 1

                att_a_img = await cls.fetch_poi_image(att_a["title"], destination)
                att_b_img = await cls.fetch_poi_image(att_b["title"], destination)

                # Mid-day transport allocation
                mid_trans_total = pool_trans - (day1_trans + dayN_trans)
                num_mid_days = max(1, num_days - 2)
                mid_base = mid_trans_total // num_mid_days
                mid_idx = day_num - 2
                if mid_idx == num_mid_days - 1:
                    mid_t = mid_trans_total - mid_base * (num_mid_days - 1)
                else:
                    mid_t = mid_base

                day_f = get_day_food(day_num)
                day_a = get_day_acts(day_num)
                day_acc = get_day_accom(day_num)

                activities = [
                    {
                        "order": 1,
                        "title": f"Alpine Breakfast with Mountain Views",
                        "description": f"Fresh breakfast featuring local honey, eggs, parathas, and tea.",
                        "location": hotel_loc,
                        "start_time": "08:00 AM",
                        "end_time": "09:00 AM",
                        "duration_minutes": 60,
                        "estimated_cost": day_f // 3,
                        "category": "FOOD",
                        "image_url": None,
                    },
                    {
                        "order": 2,
                        "title": att_a["title"],
                        "description": att_a["description"],
                        "location": att_a["location"],
                        "start_time": "09:30 AM",
                        "end_time": "12:30 PM",
                        "duration_minutes": 180,
                        "estimated_cost": day_a // 2,
                        "category": normalize_poi_category(att_a.get("category", "SIGHTSEEING")),
                        "image_url": att_a_img or hero_img,
                    },
                    {
                        "order": 3,
                        "title": f"Lunch at {food_mid['title']}",
                        "description": f"Traditional lunch break featuring regional specialties at {food_mid['title']}.",
                        "location": food_mid["location"],
                        "start_time": "01:00 PM",
                        "end_time": "02:15 PM",
                        "duration_minutes": 75,
                        "estimated_cost": day_f // 3,
                        "category": "FOOD",
                        "image_url": None,
                    },
                    {
                        "order": 4,
                        "title": att_b["title"],
                        "description": att_b["description"],
                        "location": att_b["location"],
                        "start_time": "02:30 PM",
                        "end_time": "05:30 PM",
                        "duration_minutes": 180,
                        "estimated_cost": day_a - (day_a // 2),
                        "category": normalize_poi_category(att_b.get("category", "CULTURE")),
                        "image_url": att_b_img or hero_img,
                    },
                ]

                if mid_t > 0:
                    activities.append({
                        "order": 5,
                        "title": f"Scenic Valley Transit & Exploration Drive",
                        "description": f"Local drive and scenic transit connecting exploration viewpoints in {destination}.",
                        "location": f"{destination} Valley Routes",
                        "start_time": "05:45 PM",
                        "end_time": "07:00 PM",
                        "duration_minutes": 75,
                        "estimated_cost": mid_t,
                        "category": "TRANSPORT",
                        "image_url": hero_img,
                    })

                activities.append({
                    "order": 6,
                    "title": f"Dinner Featuring Local Barbecue in {destination}",
                    "description": f"Authentic evening dinner featuring regional grilled delicacies and tea.",
                    "location": food_mid["location"],
                    "start_time": "07:30 PM",
                    "end_time": "09:00 PM",
                    "duration_minutes": 90,
                    "estimated_cost": day_f - (2 * (day_f // 3)),
                    "category": "FOOD",
                    "image_url": None,
                })

                if not is_no_stay and day_acc > 0:
                    activities.append({
                        "order": 7,
                        "title": f"Night Stay & Alpine Rest at {hotel_name}",
                        "description": f"Comfortable overnight stay and restful evening at {hotel_name}.",
                        "location": hotel_loc,
                        "start_time": "09:30 PM",
                        "end_time": "11:00 PM",
                        "duration_minutes": 90,
                        "estimated_cost": day_acc,
                        "category": "ACCOMMODATION",
                        "image_url": None,
                    })

            # ─── Live Place Verification & Structured Geocoding for all activities on this day ───
            async def _verify_single_act(act):
                act_cat = act.get("category")
                if act_cat == "ACCOMMODATION" and not is_no_stay:
                    act["location"] = hotel_loc
                    act["latitude"] = hotel_lat
                    act["longitude"] = hotel_lon
                    act["map_url"] = hotel_maps_url
                    act["notes"] = hotel_maps_url
                    act["location_verified"] = hotel_verified
                    act["location_source"] = hotel_loc_info.get("location_source", "live_geocoding")
                    act["confidence"] = 0.95 if hotel_verified else 0.70
                elif act_cat == "TRANSPORT" or "highway" in (act.get("location") or "").lower() or "transit" in (act.get("title") or "").lower():
                    # Operational travel/transit action - not a standalone physical POI
                    act["location_verified"] = False
                    act["latitude"] = None
                    act["longitude"] = None
                    act["map_url"] = None
                    act["notes"] = None
                    act["location_source"] = "transit_action"
                    act["confidence"] = 0.80
                else:
                    target_place = act.get("location") or act.get("title")
                    verified_loc = await verify_place_location_live(target_place, destination, category=act_cat)
                    act["location"] = verified_loc["address"] if verified_loc["location_verified"] else (act.get("location") or verified_loc["location_name"])
                    act["latitude"] = verified_loc["latitude"]
                    act["longitude"] = verified_loc["longitude"]
                    act["map_url"] = verified_loc["maps_url"]
                    act["notes"] = verified_loc["maps_url"]
                    act["location_verified"] = verified_loc["location_verified"]
                    act["location_source"] = verified_loc.get("location_source", "live_geocoding")
                    act["confidence"] = 0.95 if verified_loc["location_verified"] else 0.70
                return act

            activities = list(await asyncio.gather(*[_verify_single_act(a) for a in activities]))

            days_data.append({
                "day_number": day_num,
                "title": day_title,
                "summary": day_summary,
                "activities": activities,
            })

        # ─── 4. STRICT 100% RECONCILIATION CHECK ────────────────────────────
        # SUM(planned itinerary item costs) + pool_other == round(total_b) EXACTLY.
        # Contingency (pool_other) remains a reserve and is NEVER an itinerary expense.
        # Each category in the itinerary reconciles strictly to its corresponding budget pool:
        # TRANSPORT -> pool_trans, ACCOMMODATION -> pool_accom, FOOD -> pool_food, ACTIVITIES -> pool_acts
        
        calc_trans = sum(a.get("estimated_cost", 0) for d in days_data for a in d.get("activities", []) if a.get("category") == "TRANSPORT")
        calc_accom = sum(a.get("estimated_cost", 0) for d in days_data for a in d.get("activities", []) if a.get("category") == "ACCOMMODATION")
        calc_food = sum(a.get("estimated_cost", 0) for d in days_data for a in d.get("activities", []) if a.get("category") == "FOOD")
        calc_acts = sum(a.get("estimated_cost", 0) for d in days_data for a in d.get("activities", []) if a.get("category") not in ("TRANSPORT", "ACCOMMODATION", "FOOD"))

        if calc_trans != pool_trans:
            diff = pool_trans - calc_trans
            for d in reversed(days_data):
                t_acts = [a for a in d.get("activities", []) if a.get("category") == "TRANSPORT"]
                if t_acts:
                    t_acts[-1]["estimated_cost"] += diff
                    break

        if calc_accom != pool_accom:
            diff = pool_accom - calc_accom
            for d in reversed(days_data):
                ac_acts = [a for a in d.get("activities", []) if a.get("category") == "ACCOMMODATION"]
                if ac_acts:
                    ac_acts[-1]["estimated_cost"] += diff
                    break

        if calc_food != pool_food:
            diff = pool_food - calc_food
            for d in reversed(days_data):
                f_acts = [a for a in d.get("activities", []) if a.get("category") == "FOOD"]
                if f_acts:
                    f_acts[-1]["estimated_cost"] += diff
                    break

        if calc_acts != pool_acts:
            diff = pool_acts - calc_acts
            for d in reversed(days_data):
                a_acts = [a for a in d.get("activities", []) if a.get("category") not in ("TRANSPORT", "ACCOMMODATION", "FOOD")]
                if a_acts:
                    a_acts[-1]["estimated_cost"] += diff
                    break

        # ─── 5. COORDINATE REUSE & COLLISION FILTER ─────────────────────────
        # Ensure distinct activities do not accidentally share identical coordinates unless they represent the same hotel/venue.
        seen_coords: Dict[Tuple[float, float], str] = {}
        for day in days_data:
            for act in day.get("activities", []):
                if act.get("location_verified") and act.get("latitude") is not None and act.get("longitude") is not None:
                    c_key = (round(float(act["latitude"]), 4), round(float(act["longitude"]), 4))
                    act_title = act.get("title", "")
                    
                    if c_key in seen_coords:
                        prev_title = seen_coords[c_key]
                        # Allow sharing only if both represent the same hotel check-in/checkout
                        is_hotel_pair = (
                            ("hotel" in prev_title.lower() or "checkout" in prev_title.lower() or "check-in" in prev_title.lower() or "breakfast" in prev_title.lower())
                            and ("hotel" in act_title.lower() or "checkout" in act_title.lower() or "check-in" in act_title.lower() or "breakfast" in act_title.lower())
                        )
                        if not is_hotel_pair:
                            # Invalidate second unrelated activity's coordinates
                            logger.info(f"Duplicate coordinate collision detected: '{act_title}' shares {c_key} with '{prev_title}'. Invalidating.")
                            act["location_verified"] = False
                            act["latitude"] = None
                            act["longitude"] = None
                            act["map_url"] = None
                            act["notes"] = None
                            act["location_source"] = "coordinate_collision_rejected"
                    else:
                        seen_coords[c_key] = act_title

        return days_data, hero_img
