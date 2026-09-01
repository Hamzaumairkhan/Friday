import httpx
import asyncio
import urllib.parse
import re

async def test_sources(query):
    print(f"=== Testing query: {query} ===")
    
    # 1. Wikipedia Page Images API
    try:
        url = f"https://en.wikipedia.org/w/api.php?action=query&titles={urllib.parse.quote(query)}&prop=pageimages|images&pithumbsize=1000&format=json"
        headers = {"User-Agent": "FridayTravelBot/2.0 (contact@friday.pk)"}
        async with httpx.AsyncClient(timeout=4, headers=headers, follow_redirects=True) as client:
            resp = await client.get(url)
            print("Wikipedia API status:", resp.status_code)
            if resp.status_code == 200:
                data = resp.json()
                pages = data.get("query", {}).get("pages", {})
                for k, v in pages.items():
                    if "thumbnail" in v:
                        print("  Found thumbnail:", v["thumbnail"].get("source"))
    except Exception as e:
        print("Wikipedia API error:", e)

    # 2. DuckDuckGo Image Search API
    try:
        token_url = f"https://duckduckgo.com/?q={urllib.parse.quote(query)}&iax=images&ia=images"
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"}
        async with httpx.AsyncClient(timeout=4, headers=headers, follow_redirects=True) as client:
            r = await client.get(token_url)
            vqd_match = re.search(r'vqd=([\d-]+)', r.text) or re.search(r'vqd="([^"]+)"', r.text)
            if vqd_match:
                vqd = vqd_match.group(1)
                img_res = await client.get(f"https://duckduckgo.com/i.js?l=us-en&o=json&q={urllib.parse.quote(query)}&vqd={vqd}&f=,,,&p=1")
                if img_res.status_code == 200:
                    img_data = img_res.json()
                    results = img_data.get("results", [])
                    print(f"  DDG found {len(results)} images:")
                    for item in results[:5]:
                        print("    - Image URL:", item.get("image"))
            else:
                print("  No DDG token found")
    except Exception as e:
        print("DDG search error:", e)

if __name__ == "__main__":
    for city in ["Rawalpindi", "Murree", "Skardu", "Hunza"]:
        asyncio.run(test_sources(city))
