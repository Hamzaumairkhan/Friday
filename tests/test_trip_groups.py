"""Tests for Trip Groups, Community Chat, Authorization, and Capacity Enforcement."""

import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.models.user import User, UserRole
from app.models.organizer import Organizer
from app.models.package import Package
from app.models.booking import Booking, BookingStatus, PaymentStatus
from app.models.trip import Trip


def test_trip_group_and_message_workflow(run_async, test_db_session):
    async def _test():
        async with test_db_session() as session:
            # Create organizer and package
            org_user = User(id="user-org-swat", email="swat@friday.pk", name="Swat Host", role=UserRole.ORGANIZER)
            traveler_user = User(id="user-trav-ali", email="ali@friday.pk", name="Ali Traveler", role=UserRole.TRAVELER)
            unconfirmed_user = User(id="user-trav-unconfirmed", email="unconfirmed@friday.pk", name="Unconfirmed", role=UserRole.TRAVELER)
            session.add_all([org_user, traveler_user, unconfirmed_user])

            org = Organizer(
                id="org-swat-heritage",
                user_id="user-org-swat",
                name="Swat Valley Heritage Tours",
                contact_email="swat@friday.pk",
                is_verified=True,
            )
            session.add(org)

            pkg = Package(
                id="pkg-swat-weekend",
                organizer_id="org-swat-heritage",
                title="Swat Weekend Escape 3D",
                destination="Swat",
                duration_days=3,
                price_per_person=22000.0,
                max_travelers=20,
            )
            session.add(pkg)

            # Confirmed booking for Ali
            confirmed_booking = Booking(
                id="bk-ali-confirmed",
                trip_id="trip-ali-1",
                package_id="pkg-swat-weekend",
                user_id="user-trav-ali",
                organizer_id="org-swat-heritage",
                travelers=2,
                total_price=44000.0,
                status=BookingStatus.CONFIRMED,
                payment_status=PaymentStatus.VERIFIED,
                package_title="Swat Weekend Escape 3D",
                organizer_name="Swat Valley Heritage Tours",
                traveler_name="Ali Traveler",
            )
            # Pending booking for unconfirmed user
            pending_booking = Booking(
                id="bk-pending-1",
                trip_id="trip-pending-1",
                package_id="pkg-swat-weekend",
                user_id="user-trav-unconfirmed",
                organizer_id="org-swat-heritage",
                travelers=1,
                total_price=22000.0,
                status=BookingStatus.PENDING,
                payment_status=PaymentStatus.PENDING,
                package_title="Swat Weekend Escape 3D",
            )
            session.add_all([confirmed_booking, pending_booking])
            await session.commit()

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # 1. Confirmed traveler can access group details
            trav_resp = await client.get(
                "/api/v1/groups/trips/pkg-swat-weekend",
                headers={"X-User-Id": "user-trav-ali", "Authorization": "Bearer user-trav-ali"},
            )
            assert trav_resp.status_code == 200
            data = trav_resp.json()
            assert data["title"] == "Swat Weekend Escape 3D"
            assert data["confirmed_travelers_count"] == 2
            assert any(m["user_id"] == "user-trav-ali" for m in data["members"])

            # 2. Confirmed traveler can post a message
            msg_resp = await client.post(
                "/api/v1/groups/trips/pkg-swat-weekend/messages",
                json={"message": "Salam everyone! What is the exact departure point in Islamabad?"},
                headers={"X-User-Id": "user-trav-ali", "Authorization": "Bearer user-trav-ali"},
            )
            assert msg_resp.status_code == 201
            assert msg_resp.json()["message"] == "Salam everyone! What is the exact departure point in Islamabad?"

            # 3. Organizer can access group and reply
            org_resp = await client.get(
                "/api/v1/groups/trips/pkg-swat-weekend",
                headers={"X-User-Id": "user-org-swat", "Authorization": "Bearer user-org-swat"},
            )
            assert org_resp.status_code == 200

            reply_resp = await client.post(
                "/api/v1/groups/trips/pkg-swat-weekend/messages",
                json={"message": "Walaikum Assalam Ali! Departure is at 6:00 AM from Motorway Chowk."},
                headers={"X-User-Id": "user-org-swat", "Authorization": "Bearer user-org-swat"},
            )
            assert reply_resp.status_code == 201
            assert reply_resp.json()["sender_role"] == "ORGANIZER"

            # 4. Message stream preserves order
            list_msg_resp = await client.get(
                "/api/v1/groups/trips/pkg-swat-weekend/messages",
                headers={"X-User-Id": "user-trav-ali", "Authorization": "Bearer user-trav-ali"},
            )
            assert list_msg_resp.status_code == 200
            messages = list_msg_resp.json()
            assert len(messages) >= 2
            assert messages[0]["sender_role"] == "TRAVELER"
            assert messages[1]["sender_role"] == "ORGANIZER"

            # 5. Unconfirmed traveler is forbidden (403)
            unconfirmed_resp = await client.get(
                "/api/v1/groups/trips/pkg-swat-weekend",
                headers={"X-User-Id": "user-trav-unconfirmed", "Authorization": "Bearer user-trav-unconfirmed"},
            )
            assert unconfirmed_resp.status_code == 403

    run_async(_test())


def test_cross_organizer_group_idor_protection(run_async, test_db_session):
    async def _test():
        async with test_db_session() as session:
            # Org 1
            u1 = User(id="user-org-1", email="org1@friday.pk", role=UserRole.ORGANIZER)
            o1 = Organizer(id="org-1", user_id="user-org-1", name="Organizer One")
            p1 = Package(id="pkg-org1-trip", organizer_id="org-1", title="Org 1 Trip", destination="Swat", duration_days=3, price_per_person=20000)

            # Org 2
            u2 = User(id="user-org-2", email="org2@friday.pk", role=UserRole.ORGANIZER)
            o2 = Organizer(id="org-2", user_id="user-org-2", name="Organizer Two")

            session.add_all([u1, o1, p1, u2, o2])
            await session.commit()

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # Org 2 attempts to access Org 1's group -> 403 Forbidden
            resp = await client.get(
                "/api/v1/groups/trips/pkg-org1-trip",
                headers={"X-User-Id": "user-org-2", "Authorization": "Bearer user-org-2"},
            )
            assert resp.status_code == 403

    run_async(_test())


def test_package_capacity_enforcement(run_async, test_db_session):
    async def _test():
        async with test_db_session() as session:
            org_user = User(id="user-org-cap", email="cap@friday.pk", role=UserRole.ORGANIZER)
            traveler_1 = User(id="user-t1-cap", email="t1cap@friday.pk", role=UserRole.TRAVELER)
            traveler_2 = User(id="user-t2-cap", email="t2cap@friday.pk", role=UserRole.TRAVELER)
            session.add_all([org_user, traveler_1, traveler_2])

            org = Organizer(id="org-cap", user_id="user-org-cap", name="Capacity Test Org")
            session.add(org)

            # Package with max capacity of 5 travelers
            pkg = Package(
                id="pkg-small-cap",
                organizer_id="org-cap",
                title="Small Jeep Expedition",
                destination="Kumrat",
                duration_days=3,
                price_per_person=25000.0,
                max_travelers=5,
            )
            session.add(pkg)

            # Traveler 1 confirmed for 4 seats (1 remaining)
            bk1 = Booking(
                id="bk-cap-1",
                trip_id="trip-cap-1",
                package_id="pkg-small-cap",
                user_id="user-t1-cap",
                organizer_id="org-cap",
                travelers=4,
                total_price=100000.0,
                status=BookingStatus.CONFIRMED,
            )
            # Private trip for traveler 2
            t2_trip = Trip(
                id="trip-t2-cap",
                owner_id="user-t2-cap",
                destination="Kumrat",
                duration=3,
            )
            session.add_all([bk1, t2_trip])
            await session.commit()

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # Traveler 2 attempts to book 3 seats (4 + 3 = 7 > 5) -> Validation Error (422)
            overbook_resp = await client.post(
                "/api/v1/bookings",
                json={"trip_id": "trip-t2-cap", "package_id": "pkg-small-cap", "travelers": 3},
                headers={"X-User-Id": "user-t2-cap", "Authorization": "Bearer user-t2-cap"},
            )
            assert overbook_resp.status_code == 422
            err_data = overbook_resp.json()
            err_text = (err_data.get("message") or err_data.get("detail") or str(err_data)).lower()
            assert "capacity" in err_text

            # Traveler 2 books 1 seat (4 + 1 = 5 <= 5) -> Success (201)
            valid_resp = await client.post(
                "/api/v1/bookings",
                json={"trip_id": "trip-t2-cap", "package_id": "pkg-small-cap", "travelers": 1},
                headers={"X-User-Id": "user-t2-cap", "Authorization": "Bearer user-t2-cap"},
            )
            assert valid_resp.status_code == 201

    run_async(_test())
