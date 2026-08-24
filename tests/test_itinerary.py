"""Tests for Itinerary generation and structure."""

from httpx import AsyncClient, ASGITransport
from app.main import app


def test_auto_generated_hierarchical_itinerary(run_async, auth_headers):
    async def _test():
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            payload = {
                "destination": "Hunza",
                "duration": 4,
                "travelers": 2,
            }
            res = await client.post("/api/v1/trips", json=payload, headers=auth_headers)
            assert res.status_code == 201
            trip_id = res.json()["id"]

            # Fetch auto-generated itinerary
            itin_res = await client.get(f"/api/v1/trips/{trip_id}/itinerary", headers=auth_headers)
            assert itin_res.status_code == 200
            itin = itin_res.json()

            assert itin["trip_id"] == trip_id
            assert len(itin["days"]) == 4

            # Verify Day and Activities structure
            day1 = itin["days"][0]
            assert day1["day_number"] == 1
            assert len(day1["activities"]) > 0

            act1 = day1["activities"][0]
            assert "title" in act1
            assert "category" in act1
            assert "confidence" in act1

    run_async(_test())
