import httpx
import asyncio
import urllib.parse
import random
import re

_PHOTO_MULTI_CACHE = {}

FOREIGN_KEYWORDS = [
    "california", "yosemite", "nevada", "utah", "arizona", "united states", "usa",
    "oregon", "colorado", "australia", "canada", "england", "scotland", "new zealand",
    "san diego", "tunnel view", "texas", "wyoming", "idaho", "alaska", "mexico",
    "virginia", "carolina", "florida", "georgia", "ohio", "michigan", "pennsylvania",
    "svk", "slovakia", "poland", "czech", "russia", "norway", "sweden", "finland",
    "germany", "austria", "switzerland", "france", "spain", "italy", "greece",
    "brazil", "argentina", "chile", "peru", "colombia", "bolivia", "japan", "korea", "china"
]

def is_valid_photo(url: str, title: str = "") -> bool:
    if not url or not isinstance(url, str):
        return False
    if not (url.startswith("http://") or url.startswith("https://")):
        return False
    if url.endswith(".svg") or ".svg" in url.lower():
        return False
    u_low = url.lower()
    t_low = title.lower()
    bad_tokens = ["flag", "map", "coat_of_arms", "emblem", "icon", "stub", "symbol", "logo", "signature", "seal", "location_in"]
    if any(bt in u_low or bt in t_low for bt in bad_tokens):
        return False
    for kw in FOREIGN_KEYWORDS:
        if kw in u_low or kw in t_low:
            return False
    return True

async def fetch_real_web_photos_multi(query: str, destination: str = "", limit: int = 12) -> list[str]:
    cache_key = f"{query.strip().lower()}:{destination.strip().lower()}"
    if cache_key in _PHOTO_MULTI_CACHE and _PHOTO_MULTI_CACHE[cache_key]:
        return _PHOTO_MULTI_CACHE[cache_key]

    headers = {
        "User-Agent": "FridayTravelAI/2.0 (https://friday.pk; travel@friday.pk)",
        "Accept": "application/json",
    }

    clean_q = query.strip()
    clean_d = destination.strip()
    
    search_queries = []
    if clean_d and clean_d.lower() not in clean_q.lower():
        search_queries.append(f"{clean_q} {clean_d} Pakistan")
        search_queries.append(f"{clean_q} {clean_d}")
    else:
        search_queries.append(f"{clean_q} Pakistan")
        search_queries.append(clean_q)

    found_urls = []
    seen = set()

    async with httpx.AsyncClient(timeout=4.0, headers=headers, follow_redirects=True) as client:
        for sq in search_queries:
            if len(found_urls) >= limit:
                break
            try:
                # 1. Wikipedia Generator Search with PageImages
                url = (
                    f"https://en.wikipedia.org/w/api.php?action=query&generator=search"
                    f"&gsrsearch={urllib.parse.quote(sq)}"
                    f"&gsrlimit={limit}&prop=pageimages&piprop=thumbnail&pithumbsize=1200&format=json"
                )
                resp = await client.get(url)
                if resp.status_code == 200:
                    data = resp.json()
                    pages = data.get("query", {}).get("pages", {})
                    for pid, p in pages.items():
                        thumb = p.get("thumbnail", {}).get("source")
                        title = p.get("title", "")
                        if thumb and thumb not in seen and is_valid_photo(thumb, title):
                            seen.add(thumb)
                            found_urls.append(thumb)
            except Exception as e:
                pass

            # 2. Also check direct summary for main topic
            try:
                clean_term = sq.strip().replace(" ", "_")
                sum_url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{urllib.parse.quote(clean_term)}"
                sum_resp = await client.get(sum_url)
                if sum_resp.status_code == 200:
                    s_data = sum_resp.json()
                    img = s_data.get("originalimage", {}).get("source") or s_data.get("thumbnail", {}).get("source")
                    title = s_data.get("title", "")
                    if img and img not in seen and is_valid_photo(img, title):
                        seen.add(img)
                        found_urls.append(img)
            except Exception:
                pass

    if found_urls:
        _PHOTO_MULTI_CACHE[cache_key] = found_urls
    return found_urls

async def test():
    for dest in ["Rawalpindi", "Skardu", "Hunza", "Murree", "Swat", "Lahore"]:
        photos = await fetch_real_web_photos_multi(dest)
        print(f"Destination '{dest}': {len(photos)} photos found.")
        for idx, p in enumerate(photos[:4]):
            print(f"  Option {idx+1}: {p}")

if __name__ == "__main__":
    asyncio.run(test())
