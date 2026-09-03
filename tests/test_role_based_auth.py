"""Comprehensive unit and integration tests for Role-Based Authentication, Authorization, and IDOR protection."""

import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


def test_user_registration_as_traveler(run_async):
    """1. User registration with TRAVELER role creates clean traveler account."""
    async def _test():
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            payload = {
                "email": "traveler.test@friday.pk",
                "name": "Zahid Traveler",
                "role": "TRAVELER",
            }
            resp = await ac.post("/api/v1/auth/register", json=payload)
            assert resp.status_code == 201
            data = resp.json()
            assert data["user"]["email"] == "traveler.test@friday.pk"
            assert data["user"]["role"] == "TRAVELER"
            assert data["organizer_profile"] is None
            assert "token" in data

    run_async(_test())


def test_organizer_registration_and_application(run_async):
    """2. Organizer registration creates User + Organizer profile with PENDING status."""
    async def _test():
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            payload = {
                "email": "organizer.kaghan@friday.pk",
                "name": "Bilal Kaghan",
                "role": "ORGANIZER",
                "organizer_name": "Kaghan Valley Treks",
                "contact_phone": "+923009988776",
                "location": "Naran, Kaghan",
                "destinations": ["Naran", "Kaghan", "Babusar"],
            }
            resp = await ac.post("/api/v1/auth/register", json=payload)
            assert resp.status_code == 201
            data = resp.json()
            assert data["user"]["role"] == "ORGANIZER"
            assert data["organizer_profile"] is not None
            assert data["organizer_profile"]["name"] == "Kaghan Valley Treks"
            assert data["organizer_profile"]["verification_status"] == "PENDING"
            assert data["organizer_profile"]["is_verified"] is False

    run_async(_test())


def test_user_and_organizer_login_flows(run_async):
    """3 & 4. Valid login with matching intended roles."""
    async def _test():
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            # Register user
            await ac.post("/api/v1/auth/register", json={"email": "trav.login@friday.pk", "name": "Trav Login", "role": "TRAVELER"})
            # Register organizer
            await ac.post("/api/v1/auth/register", json={"email": "org.login@friday.pk", "name": "Org Login", "role": "ORGANIZER", "organizer_name": "Org Login Expeditions"})

            # 3. User login
            u_login = await ac.post("/api/v1/auth/login", json={"email": "trav.login@friday.pk", "intended_role": "TRAVELER"})
            assert u_login.status_code == 200
            assert u_login.json()["user"]["role"] == "TRAVELER"

            # 4. Organizer login
            o_login = await ac.post("/api/v1/auth/login", json={"email": "org.login@friday.pk", "intended_role": "ORGANIZER"})
            assert o_login.status_code == 200
            assert o_login.json()["user"]["role"] == "ORGANIZER"
            assert o_login.json()["organizer_profile"] is not None

    run_async(_test())


def test_privilege_escalation_attempt_fails(run_async):
    """5. Normal user attempting to log in as ORGANIZER is rejected with 403 Forbidden."""
    async def _test():
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            # Register normal user
            await ac.post("/api/v1/auth/register", json={"email": "plain.user@friday.pk", "name": "Plain User", "role": "TRAVELER"})

            # Attempt to login as ORGANIZER
            resp = await ac.post("/api/v1/auth/login", json={"email": "plain.user@friday.pk", "intended_role": "ORGANIZER"})
            assert resp.status_code == 403
            assert "does not have ORGANIZER privileges" in resp.json()["detail"]

    run_async(_test())


def test_user_forbidden_from_organizer_endpoints(run_async):
    """6 & 7. Normal user accessing /organizers/me or creating packages gets 403."""
    async def _test():
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            reg = await ac.post("/api/v1/auth/register", json={"email": "user.blocked@friday.pk", "name": "Blocked User", "role": "TRAVELER"})
            user_token = reg.json()["token"]
            headers = {"Authorization": f"Bearer {user_token}"}

            # 6. Access /organizers/me
            me_resp = await ac.get("/api/v1/organizers/me", headers=headers)
            assert me_resp.status_code == 403

            # 7. Attempt package creation
            pkg_payload = {
                "title": "Unauthorized Package",
                "destination": "Hunza",
                "duration_days": 3,
                "price_per_person": 25000.0,
            }
            pkg_resp = await ac.post("/api/v1/organizers/me/packages", json=pkg_payload, headers=headers)
            assert pkg_resp.status_code == 403

    run_async(_test())


def test_organizer_package_crud_and_idor_protection(run_async):
    """8. Organizer A cannot modify or delete Organizer B's package."""
    async def _test():
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            # Register Organizer A
            reg_a = await ac.post("/api/v1/auth/register", json={"email": "org.a@friday.pk", "name": "Org A", "role": "ORGANIZER", "organizer_name": "Org A Tours"})
            token_a = reg_a.json()["token"]
            headers_a = {"Authorization": f"Bearer {token_a}"}

            # Register Organizer B
            reg_b = await ac.post("/api/v1/auth/register", json={"email": "org.b@friday.pk", "name": "Org B", "role": "ORGANIZER", "organizer_name": "Org B Tours"})
            token_b = reg_b.json()["token"]
            headers_b = {"Authorization": f"Bearer {token_b}"}

            # Org A creates a package
            pkg_a_resp = await ac.post(
                "/api/v1/organizers/me/packages",
                json={"title": "Org A Hunza Tour", "destination": "Hunza", "duration_days": 4, "price_per_person": 35000.0},
                headers=headers_a,
            )
            assert pkg_a_resp.status_code == 201
            pkg_a_id = pkg_a_resp.json()["id"]

            # Org B attempts to update Org A's package → 403 Forbidden
            hack_resp = await ac.patch(
                f"/api/v1/organizers/me/packages/{pkg_a_id}",
                json={"title": "Hacked Title", "price_per_person": 1000.0},
                headers=headers_b,
            )
            assert hack_resp.status_code == 403
            assert "modify another organizer's package" in hack_resp.json()["detail"]

            # Org B attempts to delete Org A's package → 403 Forbidden
            del_resp = await ac.delete(
                f"/api/v1/organizers/me/packages/{pkg_a_id}",
                headers=headers_b,
            )
            assert del_resp.status_code == 403

            # Org A can successfully update own package
            valid_update = await ac.patch(
                f"/api/v1/organizers/me/packages/{pkg_a_id}",
                json={"price_per_person": 37000.0},
                headers=headers_a,
            )
            assert valid_update.status_code == 200
            assert valid_update.json()["price_per_person"] == 37000.0

    run_async(_test())


def test_organizer_verification_status_is_protected(run_async):
    """10. Organizer cannot tamper with is_verified or verification_status via PATCH /me."""
    async def _test():
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            reg = await ac.post("/api/v1/auth/register", json={"email": "org.tamper@friday.pk", "name": "Org Tamper", "role": "ORGANIZER", "organizer_name": "Tamper Tours"})
            token = reg.json()["token"]
            headers = {"Authorization": f"Bearer {token}"}

            # Attempt to set verification_status to VERIFIED and is_verified to True
            tamper_resp = await ac.patch(
                "/api/v1/organizers/me",
                json={"name": "Tamper Updated", "verification_status": "VERIFIED", "is_verified": True},
                headers=headers,
            )
            assert tamper_resp.status_code == 200
            data = tamper_resp.json()
            assert data["name"] == "Tamper Updated"
            # Must remain PENDING and False!
            assert data["verification_status"] == "PENDING"
            assert data["is_verified"] is False

    run_async(_test())


def test_organizer_booking_management_and_idor(run_async, test_db_session):
    """11 & 12. User books package, Organizer views booking and updates status."""
    async def _test():
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            # 1. Register Traveler
            reg_u = await ac.post("/api/v1/auth/register", json={"email": "booking.traveler@friday.pk", "name": "Booking Traveler", "role": "TRAVELER"})
            u_token = reg_u.json()["token"]
            u_headers = {"Authorization": f"Bearer {u_token}"}

            # 2. Register Organizer
            reg_o = await ac.post("/api/v1/auth/register", json={"email": "booking.org@friday.pk", "name": "Booking Org", "role": "ORGANIZER", "organizer_name": "Booking Org Expeditions"})
            o_token = reg_o.json()["token"]
            o_headers = {"Authorization": f"Bearer {o_token}"}

            # 3. Organizer creates package
            pkg_resp = await ac.post(
                "/api/v1/organizers/me/packages",
                json={"title": "Exclusive Swat Tour", "destination": "Swat", "duration_days": 3, "price_per_person": 22000.0},
                headers=o_headers,
            )
            pkg_id = pkg_resp.json()["id"]

            # 4. Traveler creates trip and booking
            trip_resp = await ac.post("/api/v1/trips", json={"destination": "Swat", "duration": 3, "travelers": 2}, headers=u_headers)
            trip_id = trip_resp.json()["id"]

            booking_resp = await ac.post(
                "/api/v1/bookings",
                json={"trip_id": trip_id, "package_id": pkg_id, "travelers": 2, "notes": "Need vegetarian food"},
                headers=u_headers,
            )
            assert booking_resp.status_code == 201
            booking_id = booking_resp.json()["id"]

            # 5. Organizer views their bookings
            org_bookings = await ac.get("/api/v1/organizers/me/bookings", headers=o_headers)
            assert org_bookings.status_code == 200
            bookings_list = org_bookings.json()
            assert len(bookings_list) >= 1
            assert any(b["id"] == booking_id for b in bookings_list)

            # 6. Organizer updates booking status to CONFIRMED
            stat_resp = await ac.patch(
                f"/api/v1/organizers/me/bookings/{booking_id}/status",
                json={"status": "CONFIRMED"},
                headers=o_headers,
            )
            assert stat_resp.status_code == 200
            assert stat_resp.json()["status"] == "CONFIRMED"

    run_async(_test())


def test_unauthenticated_requests_return_401(run_async):
    """13. Missing authentication header returns 401 Unauthorized."""
    async def _test():
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            resp_trips = await ac.get("/api/v1/trips")
            assert resp_trips.status_code == 401

            resp_org = await ac.get("/api/v1/organizers/me")
            assert resp_org.status_code == 401

    run_async(_test())
