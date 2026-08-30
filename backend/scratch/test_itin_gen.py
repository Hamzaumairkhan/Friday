import asyncio
import httpx

async def test():
    async with httpx.AsyncClient(timeout=30.0) as client:
        res = await client.post('http://localhost:8000/api/v1/packages/generate-itinerary', json={
            'destination': 'Pine Valley',
            'duration_days': 3
        })
        print("STATUS:", res.status_code)
        data = res.json()
        print("DESTINATION:", data.get('destination'))
        print("DAYS COUNT:", len(data.get('days', [])))
        print("SAMPLE DAY 1:", data.get('days', [])[0] if data.get('days') else None)

if __name__ == '__main__':
    asyncio.run(test())
