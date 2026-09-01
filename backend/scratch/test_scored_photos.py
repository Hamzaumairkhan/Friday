import httpx
import asyncio
import urllib.parse

_PHOTO_MULTI_CACHE = {}

BAD_TOKENS = [
    "flag", "map", "coat_of_arms", "emblem", "icon", "stub", "symbol", "logo", 
    "signature", "seal", "location_in", "insignia", "portrait", "diagram", 
    "chart", "npg_", "drawing", "sketch", "cemetery", "hospital", "crash", 
    "bombing", "election", "campaign", "attack", "casualty", "airways", "boeing"
]

SCENIC_KEYWORDS = [
    "mosque", "masjid", "fort", "valley", "lake", "river", "mountain", "hills", 
    "resort", "monument", "pass", "glacier", "desert", "bazaar", "skyline", 
    "park", "garden", "street", "bridge", "station", "view", "sunset", "temple", 
    "plateau", "waterfall", "village", "panorama", "heritage", "mall", "tower"
]

def score_photo(url: str, title: str) -> int:
    u_low = url.lower()
    t_low = title.lower()
    if any(bt in u_low or bt in t_low for bt in BAD_TOKENS):
        return -100
    if u_low.endswith(".svg") or ".svg" in u_low:
        return -100
    score = 0
    for kw in SCENIC_KEYWORDS:
        if kw in t_low:
            score += 10
        if kw in u_low:
            score += 5
    if "1280px" in u_low or "1024px" in u_low:
        score += 2
    return score

async def fetch_real_web_photos_multi(query: str, destination: str = "", limit: int = 15) -> list[str]:
    headers = {"User-Agent": "FridayTravelAI/2.0 (https://friday.pk; travel@friday.pk)"}
    clean_q = query.strip()
    clean_d = destination.strip()
    
    search_queries = [
        f"{clean_q} tourism Pakistan",
        f"{clean_q} Pakistan",
        clean_q
    ]
    if clean_d and clean_d.lower() not in clean_q.lower():
        search_queries.insert(0, f"{clean_q} {clean_d} Pakistan")

    scored_photos = []
    seen = set()

    async with httpx.AsyncClient(timeout=4.0, headers=headers, follow_redirects=True) as client:
        for sq in search_queries:
            try:
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
                        if thumb and thumb not in seen:
                            s = score_photo(thumb, title)
                            if s >= 0:
                                seen.add(thumb)
                                scored_photos.append((s, thumb, title))
            except Exception:
                pass

    # Sort by score descending
    scored_photos.sort(key=lambda x: x[0], reverse=True)
    return [p[1] for p in scored_photos]

async def test():
    for dest in ["Rawalpindi", "Islamabad", "Murree", "Skardu", "Hunza", "Swat", "Lahore", "Karachi", "Neelum Valley"]:
        photos = await fetch_real_web_photos_multi(dest)
        print(f"\nDestination '{dest}': {len(photos)} scenic web photos found.")
        for idx, p in enumerate(photos[:5]):
            print(f"  [{idx+1}] {p}")

if __name__ == "__main__":
    asyncio.run(test())
