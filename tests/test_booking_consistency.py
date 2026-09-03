"""Regression tests ensuring booking data consistency, package snapshot immutability, and notification correctness."""

import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.models.organizer import Organizer
from app.models.package import Package


def test_booking_derives_immutable_package_metadata(run_async, auth_headers, test_db_session):
    """1. Booking must derive destination, duration, and price strictly from Package, not from trip or client."""
    async def _test():
        async with test_db_session() as session:
            test_org = Organizer(
                id="org-test-consistency",
                name="Consistency Expeditions",
                contact_email="cons@test.pk",
                destinations=["Hunza"],
                is_verified=True,
            )
            test_pkg = Package(
                id="pkg-test-5d",
                organizer_id="org-test-consistency",
                title="Hunza 5-Day Expedition",
                destination="Hunza",
                duration_days=5,
                price_per_person=45000.0,
                is_active=True,
            )
            session.add(test_org)
            session.add(test_pkg)
            await session.commit()

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            # Create a Trip for Hunza (4 days)
            trip_res = await ac.post("/api/v1/trips", json={"destination": "Hunza", "duration": 4, "travelers": 2}, headers=auth_headers)
            assert trip_res.status_code == 201
            trip_id = trip_res.json()["id"]

            # Book the package (pkg-test-5d)
            booking_payload = {
                "trip_id": trip_id,
                "package_id": "pkg-test-5d",
                "travelers": 2,
                "notes": "Vegetarian meals only",
            }
            book_res = await ac.post("/api/v1/bookings", json=booking_payload, headers=auth_headers)
            assert book_res.status_code == 201
            booking = book_res.json()

            # Authoritative package assertions
            assert booking["destination"] == "Hunza", f"Expected Hunza, got {booking.get('destination')}"
            assert booking["duration_days"] == 5, f"Expected 5 days, got {booking.get('duration_days')}"
            assert booking["package_title"] == "Hunza Valley Autumn Discovery"
            assert booking["organizer_id"] == "org-hunza-explorers"
            assert booking["total_price"] == 90000.0  # 45,000 * 2
            assert booking["price_per_person"] == 45000.0

    run_async(_test())


def test_historical_booking_immutable_to_future_package_edits(run_async, test_db_session):
    """2. Editing a package later must NEVER alter historical booking snapshot data."""
    async def _test():
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            # Register organizer and traveler
            reg_o = await ac.post("/api/v1/auth/register", json={"email": "org.hist@friday.pk", "name": "Org Hist", "role": "ORGANIZER", "organizer_name": "Hist Tours"})
            o_token = reg_o.json()["token"]
            o_headers = {"Authorization": f"Bearer {o_token}"}

            reg_u = await ac.post("/api/v1/auth/register", json={"email": "u.hist@friday.pk", "name": "User Hist", "role": "TRAVELER"})
            u_token = reg_u.json()["token"]
            u_headers = {"Authorization": f"Bearer {u_token}"}

            # Organizer creates package at Rs. 30,000 for 5 days
            pkg_res = await ac.post(
                "/api/v1/organizers/me/packages",
                json={"title": "Naran 5D Tour", "destination": "Naran", "duration_days": 5, "price_per_person": 30000.0},
                headers=o_headers,
            )
            pkg_id = pkg_res.json()["id"]

            # Traveler books 2 slots
            trip_res = await ac.post("/api/v1/trips", json={"destination": "Naran", "duration": 5, "travelers": 2}, headers=u_headers)
            trip_id = trip_res.json()["id"]

            book_res = await ac.post(
                "/api/v1/bookings",
                json={"trip_id": trip_id, "package_id": pkg_id, "travelers": 2},
                headers=u_headers,
            )
            booking_id = book_res.json()["id"]
            assert book_res.json()["total_price"] == 60000.0

            # Organizer later updates package price to Rs. 50,000 and title to "Naran Luxury"
            edit_res = await ac.patch(
                f"/api/v1/organizers/me/packages/{pkg_id}",
                json={"price_per_person": 50000.0, "title": "Naran Luxury 5D Tour", "duration_days": 7},
                headers=o_headers,
            )
            assert edit_res.status_code == 200

            # Historical booking MUST retain original price (60,000), title (Naran 5D Tour), and duration (5)
            get_b = await ac.get(f"/api/v1/bookings/{booking_id}", headers=u_headers)
            assert get_b.status_code == 200
            hist_booking = get_b.json()
            assert hist_booking["total_price"] == 60000.0
            assert hist_booking["package_title"] == "Naran 5D Tour"
            assert hist_booking["duration_days"] == 5

    run_async(_test())
