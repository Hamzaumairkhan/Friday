"""Tests for Trip management and lifecycle."""

from httpx import AsyncClient, ASGITransport
from app.main import app


def test_create_and_get_trip(run_async, auth_headers):
    async def _test():
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            payload = {
                "destination": "Hunza",
                "origin": "Islamabad",
                "duration": 4,
                "travelers": 5,
                "budget_per_person": 40000,
                "preferences": ["sightseeing", "cultural foods"],
            }
            res = await client.post("/api/v1/trips", json=payload, headers=auth_headers)
            assert res.status_code == 201
            trip = res.json()
            assert trip["destination"] == "Hunza"
            assert trip["travelers"] == 5
            assert trip["budget_total"] == 200000.0
            trip_id = trip["id"]

            # Fetch trip by ID
            get_res = await client.get(f"/api/v1/trips/{trip_id}", headers=auth_headers)
            assert get_res.status_code == 200
            assert get_res.json()["id"] == trip_id

    run_async(_test())


def test_list_user_trips(run_async, auth_headers):
    async def _test():
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            r1 = await client.post("/api/v1/trips", json={"destination": "Skardu", "duration": 5}, headers=auth_headers)
            assert r1.status_code == 201
            r2 = await client.post("/api/v1/trips", json={"destination": "Swat", "duration": 3}, headers=auth_headers)
            assert r2.status_code == 201

            res = await client.get("/api/v1/trips", headers=auth_headers)
            assert res.status_code == 200
            trips = res.json()
            assert len(trips) >= 2

    run_async(_test())


def test_unauthorized_trip_access(run_async):
    async def _test():
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.get("/api/v1/trips")
            assert res.status_code == 401

    run_async(_test())
