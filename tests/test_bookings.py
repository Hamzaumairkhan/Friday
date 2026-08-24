"""Tests for Booking creation and state tracking."""

from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database.seed import seed_initial_data_async
from tests.conftest import TestSessionLocal


def test_create_and_view_booking(run_async, auth_headers):
    async def _test():
        async with TestSessionLocal() as session:
            await seed_initial_data_async(session=session)

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            # 1. Create a trip
            trip_res = await client.post(
                "/api/v1/trips",
                json={"destination": "Hunza", "duration": 4, "travelers": 2},
                headers=auth_headers,
            )
            trip_id = trip_res.json()["id"]

            # 2. Get packages to find pkg id
            pkgs = (await client.get("/api/v1/packages")).json()
            package = pkgs[0]

            # 3. Create booking request
            booking_payload = {
                "trip_id": trip_id,
                "package_id": package["id"],
                "travelers": 2,
                "notes": "Vegetarian meals requested for 1 traveler",
            }
            booking_res = await client.post("/api/v1/bookings", json=booking_payload, headers=auth_headers)
            assert booking_res.status_code == 201
            booking = booking_res.json()

            assert booking["trip_id"] == trip_id
            assert booking["package_id"] == package["id"]
            assert booking["status"] == "PENDING"
            assert booking["total_price"] == package["price_per_person"] * 2

            # 4. View booking by ID
            booking_id = booking["id"]
            get_res = await client.get(f"/api/v1/bookings/{booking_id}", headers=auth_headers)
            assert get_res.status_code == 200
            assert get_res.json()["id"] == booking_id

    run_async(_test())
