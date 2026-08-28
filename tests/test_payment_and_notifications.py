"""Tests for payment proof upload, organizer verification, notifications, and onboarding fields."""

import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.models.user import User, UserRole
from app.models.organizer import Organizer
from app.models.package import Package
from app.models.booking import Booking, BookingStatus, PaymentStatus
from app.repositories.user_repository import UserRepository
from app.repositories.organizer_repository import OrganizerRepository
from app.repositories.package_repository import PackageRepository
from app.repositories.booking_repository import BookingRepository


def test_organizer_onboarding_fields_persisted(run_async, test_db_session):
    async def _test():
        async with test_db_session() as session:
            user = User(
                id="org-user-1",
                email="guide@friday.pk",
                name="Gilgit Guide",
                role=UserRole.ORGANIZER,
                is_active=True,
            )
            session.add(user)

            org = Organizer(
                id="org-gilgit-expeditions",
                user_id="org-user-1",
                name="Gilgit Expeditions",
                description="Local Northern Pakistan guide team",
                contact_phone="+923001234567",
                location="Gilgit",
                destinations=["Gilgit", "Hunza"],
                number_of_buses=4,
                vehicle_capacity=18,
                maximum_group_size=25,
                experience_years=12,
                payment_account_title="Gilgit Expeditions",
                payment_account_number="PK12MEZN00123456",
                payment_bank_name="Meezan Bank",
                onboarding_completed=True,
            )
            session.add(org)
            await session.commit()

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get(
                "/api/v1/organizers/me",
                headers={"X-User-Id": "org-user-1", "Authorization": "Bearer org-user-1"},
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["name"] == "Gilgit Expeditions"
            assert data["number_of_buses"] == 4
            assert data["vehicle_capacity"] == 18
            assert data["maximum_group_size"] == 25
            assert data["experience_years"] == 12
            assert data["payment_bank_name"] == "Meezan Bank"
            assert data["onboarding_completed"] is True
            assert data["is_verified"] is False  # Cannot self-verify

    run_async(_test())


def test_payment_proof_upload_and_verification_workflow(run_async, test_db_session):
    async def _test():
        # Setup: traveler, organizer, package, booking
        async with test_db_session() as session:
            traveler = User(id="user-t1", email="traveler1@friday.pk", name="Sara", role=UserRole.TRAVELER)
            org_user = User(id="user-o1", email="org1@friday.pk", name="Zahid", role=UserRole.ORGANIZER)
            session.add_all([traveler, org_user])

            org = Organizer(
                id="org-zahid-tours",
                user_id="user-o1",
                name="Zahid Tours",
                contact_email="org1@friday.pk",
                payment_account_title="Zahid Tours",
                payment_account_number="PK99HBL0011223344",
                payment_bank_name="HBL",
            )
            session.add(org)

            pkg = Package(
                id="pkg-skardu-7d",
                organizer_id="org-zahid-tours",
                title="Skardu 7D Trek",
                destination="Skardu",
                duration_days=7,
                price_per_person=45000.0,
                max_travelers=15,
                image_url="https://images.unsplash.com/photo-1627896157734-4d7d4388f28b",
            )
            session.add(pkg)

            booking = Booking(
                id="bk-test-1",
                trip_id="trip-1",
                package_id="pkg-skardu-7d",
                user_id="user-t1",
                organizer_id="org-zahid-tours",
                travelers=2,
                total_price=90000.0,
                status=BookingStatus.PENDING,
                package_title="Skardu 7D Trek",
                destination="Skardu",
                price_per_person=45000.0,
                organizer_name="Zahid Tours",
                traveler_name="Sara",
            )
            session.add(booking)
            await session.commit()

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # 1. Traveler uploads payment proof
            proof_resp = await client.post(
                "/api/v1/bookings/bk-test-1/payment-proof",
                json={"payment_proof_url": "https://res.cloudinary.com/demo/image/upload/sample.jpg"},
                headers={"X-User-Id": "user-t1", "Authorization": "Bearer user-t1"},
            )
            assert proof_resp.status_code == 200
            assert proof_resp.json()["payment_status"] == "PROOF_UPLOADED"
            assert proof_resp.json()["payment_proof_url"] == "https://res.cloudinary.com/demo/image/upload/sample.jpg"

            # 2. Organizer verifies payment
            verify_resp = await client.patch(
                "/api/v1/organizers/me/bookings/bk-test-1/payment",
                json={"action": "VERIFY"},
                headers={"X-User-Id": "user-o1", "Authorization": "Bearer user-o1"},
            )
            assert verify_resp.status_code == 200
            assert verify_resp.json()["payment_status"] == "VERIFIED"
            assert verify_resp.json()["status"] == "CONFIRMED"

            # 3. Check notifications created for traveler
            notif_resp = await client.get(
                "/api/v1/notifications",
                headers={"X-User-Id": "user-t1", "Authorization": "Bearer user-t1"},
            )
            assert notif_resp.status_code == 200
            notifs = notif_resp.json()
            assert len(notifs) >= 1
            assert any(n["type"] == "PAYMENT_VERIFIED" for n in notifs)

    run_async(_test())


def test_payment_proof_cross_user_idor_protection(run_async, test_db_session):
    async def _test():
        async with test_db_session() as session:
            user1 = User(id="user-t1", email="t1@friday.pk", role=UserRole.TRAVELER)
            user2 = User(id="user-t2", email="t2@friday.pk", role=UserRole.TRAVELER)
            session.add_all([user1, user2])

            booking = Booking(
                id="bk-t1-owned",
                trip_id="trip-1",
                package_id="pkg-1",
                user_id="user-t1",
                organizer_id="org-1",
                travelers=1,
                total_price=30000.0,
            )
            session.add(booking)
            await session.commit()

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # User 2 attempts to upload proof to User 1's booking -> 403 Forbidden
            resp = await client.post(
                "/api/v1/bookings/bk-t1-owned/payment-proof",
                json={"payment_proof_url": "https://cloudinary.com/hack.jpg"},
                headers={"X-User-Id": "user-t2", "Authorization": "Bearer user-t2"},
            )
            assert resp.status_code == 403

    run_async(_test())
