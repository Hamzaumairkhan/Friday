import asyncio
import httpx
import urllib.parse

async def test_commons(query):
    headers = {"User-Agent": "FridayTravelAI/1.0 (travel@friday.pk)"}
    # Wikimedia Commons API search
    url = f"https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch={urllib.parse.quote(query)}&gsrlimit=10&prop=imageinfo&iiprop=url|size|mime&format=json"
    async with httpx.AsyncClient(timeout=5.0, headers=headers) as client:
        res = await client.get(url)
        data = res.json()
        pages = data.get("query", {}).get("pages", {})
        urls = []
        for pid, pdata in pages.items():
            info = pdata.get("imageinfo", [{}])[0]
            img_url = info.get("url")
            mime = info.get("mime", "")
            if img_url and ("image/jpeg" in mime or "image/png" in mime or "image/webp" in mime):
                urls.append(img_url)
        print(f"Commons found {len(urls)} images for '{query}':")
        for u in urls[:5]:
            print("  ", u)
        return urls

async def main():
    await test_commons("Rawalpindi Pakistan landmark")
    await test_commons("Hunza Valley mountains Pakistan")
    await test_commons("Lahore Badshahi Mosque food street")

if __name__ == "__main__":
    asyncio.run(main())
