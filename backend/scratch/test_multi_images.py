import httpx
import asyncio
import urllib.parse

async def test_search_multiple_images(query):
    print(f"\n================ QUERY: {query} ================")
    headers = {"User-Agent": "FridayTravelAI/2.0 (https://friday.pk; travel@friday.pk)"}
    
    # 1. Search Wikipedia for pages matching this city/destination and get all high-res thumbnails!
    search_url = (
        f"https://en.wikipedia.org/w/api.php?action=query&generator=search"
        f"&gsrsearch={urllib.parse.quote(query + ' Pakistan')}"
        f"&gsrlimit=12&prop=pageimages&piprop=thumbnail&pithumbsize=1200&format=json"
    )
    
    async with httpx.AsyncClient(timeout=5, headers=headers, follow_redirects=True) as client:
        resp = await client.get(search_url)
        if resp.status_code == 200:
            data = resp.json()
            pages = data.get("query", {}).get("pages", {})
            found = []
            for pid, p in pages.items():
                thumb = p.get("thumbnail", {}).get("source")
                title = p.get("title", "")
                if thumb and not any(bad in thumb.lower() for bad in ["flag", "map", "coat_of_arms", "emblem", "icon", "stub", "symbol", "logo"]):
                    found.append({"title": title, "url": thumb})
            
            print(f"Found {len(found)} distinct live web images for '{query}':")
            for i, f in enumerate(found):
                print(f"  [{i+1}] {f['title']}: {f['url']}")
        else:
            print("Failed with status:", resp.status_code)

if __name__ == "__main__":
    for city in ["Rawalpindi", "Islamabad", "Murree", "Skardu", "Hunza", "Swat", "Lahore", "Karachi", "Neelum Valley"]:
        asyncio.run(test_search_multiple_images(city))
