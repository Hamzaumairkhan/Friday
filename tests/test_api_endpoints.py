"""Comprehensive API endpoint testing for all v1 REST routes."""

import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database.seed import seed_initial_data_async


def test_health_endpoint(run_async):
    """Verify /health returns structured subsystem diagnostics."""
    async def _test():
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            resp = await ac.get("/health")
            assert resp.status_code == 200
            data = resp.json()
            assert "status" in data
            assert data["status"] in ("healthy", "degraded")
            assert "subsystems" in data
            assert "database" in data["subsystems"]
            assert data["subsystems"]["database"]["status"] == "connected"

    run_async(_test())


def test_api_trips_crud(run_async, auth_headers):
    """Verify creating, listing, and retrieving trips."""
    async def _test():
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            # 1. Create Trip
            payload = {
                "title": "Hunza Autumn Expedition",
                "destination": "Hunza",
                "origin": "Islamabad",
                "duration": 4,
                "travelers": 2,
                "total_budget": 80000.0,
                "style": "standard",
            }
            create_resp = await ac.post("/api/v1/trips", json=payload, headers=auth_headers)
            assert create_resp.status_code == 201
            trip = create_resp.json()
            trip_id = trip["id"]
            assert trip["destination"] == "Hunza"

            # 2. List Trips
            list_resp = await ac.get("/api/v1/trips", headers=auth_headers)
            assert list_resp.status_code == 200
            trips = list_resp.json()
            assert any(t["id"] == trip_id for t in trips)

            # 3. Get Trip Details
            get_resp = await ac.get(f"/api/v1/trips/{trip_id}", headers=auth_headers)
            assert get_resp.status_code == 200
            assert get_resp.json()["id"] == trip_id

            # 4. Get Invalid Trip (404)
            not_found = await ac.get("/api/v1/trips/non-existent-trip-id", headers=auth_headers)
            assert not_found.status_code == 404

    run_async(_test())


def test_api_trip_budget_summary(run_async, auth_headers):
    """Verify trip budget retrieval endpoint."""
    async def _test():
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            create_resp = await ac.post(
                "/api/v1/trips",
                json={"destination": "Skardu", "duration": 5, "travelers": 2, "total_budget": 90000.0},
                headers=auth_headers,
            )
            trip_id = create_resp.json()["id"]

            resp = await ac.get(f"/api/v1/trips/{trip_id}/budget", headers=auth_headers)
            assert resp.status_code == 200
            data = resp.json()
            assert "total_estimated" in data
            assert "categories" in data

    run_async(_test())


def test_api_organizers_and_packages(run_async, auth_headers, test_db_session):
    """Verify listing seed organizers and packages."""
    async def _test():
        async with test_db_session() as session:
            await seed_initial_data_async(session=session)

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            # 1. List Organizers
            orgs_resp = await ac.get("/api/v1/organizers", headers=auth_headers)
            assert orgs_resp.status_code == 200
            orgs = orgs_resp.json()
            assert len(orgs) >= 1
            first_org_id = orgs[0]["id"]

            # 2. Get Single Organizer
            org_resp = await ac.get(f"/api/v1/organizers/{first_org_id}", headers=auth_headers)
            assert org_resp.status_code == 200
            assert org_resp.json()["id"] == first_org_id

            # 3. List Packages
            pkgs_resp = await ac.get("/api/v1/packages", headers=auth_headers)
            assert pkgs_resp.status_code == 200
            pkgs = pkgs_resp.json()
            assert len(pkgs) >= 1

    run_async(_test())


def test_api_bookings_workflow(run_async, auth_headers, test_db_session):
    """Verify creating a booking against a seed package."""
    async def _test():
        async with test_db_session() as session:
            await seed_initial_data_async(session=session)

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            # Get packages to find pkg id
            pkgs = (await ac.get("/api/v1/packages", headers=auth_headers)).json()
            package = pkgs[0]

            # Create trip first
            trip_res = await ac.post("/api/v1/trips", json={"destination": "Hunza", "duration": 4, "travelers": 2}, headers=auth_headers)
            assert trip_res.status_code == 201
            trip_id = trip_res.json()["id"]

            # Create booking
            booking_payload = {
                "trip_id": trip_id,
                "package_id": package["id"],
                "travelers": 2,
                "notes": "Vegetarian meal preference",
            }
            book_resp = await ac.post("/api/v1/bookings", json=booking_payload, headers=auth_headers)
            assert book_resp.status_code in (200, 201)
            booking = book_resp.json()
            assert booking["package_id"] == package["id"]
            assert booking["total_price"] == package["price_per_person"] * 2

            # List user bookings
            list_b = await ac.get("/api/v1/bookings", headers=auth_headers)
            assert list_b.status_code == 200
            assert len(list_b.json()) >= 1

    run_async(_test())
