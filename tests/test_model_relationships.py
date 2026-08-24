"""Tests for SQLAlchemy 2.x database models, cascade operations, and foreign keys."""

import pytest
from app.models.user import User, UserRole
from app.models.trip import Trip, TripMember, TripStatus
from app.models.booking import Booking, BookingStatus
from app.models.organizer import Organizer
from app.models.package import Package
from app.models.budget import Budget, BudgetCategory


def test_user_model_creation(run_async, test_db_session):
    """Verify User model fields and role enum."""
    async def _test():
        async with test_db_session() as session:
            user = User(
                id="user-model-test-1",
                email="model@friday.pk",
                name="Test Traveler",
                role=UserRole.TRAVELER,
                is_active=True,
            )
            session.add(user)
            await session.commit()

            fetched = await session.get(User, "user-model-test-1")
            assert fetched is not None
            assert fetched.name == "Test Traveler"
            assert fetched.role == UserRole.TRAVELER

    run_async(_test())


def test_trip_and_budget_relationship(run_async, test_db_session):
    """Verify Trip and Budget items relationship."""
    async def _test():
        async with test_db_session() as session:
            user = User(id="user-trip-rel", email="trip_rel@friday.pk", name="Trip Owner")
            session.add(user)
            await session.flush()

            trip = Trip(
                id="trip-rel-1",
                owner_id=user.id,
                title="Swat Valley Heritage",
                destination="Swat",
                duration=3,
                travelers=2,
                budget_total=50000.0,
                status=TripStatus.PLANNED,
            )
            session.add(trip)
            await session.flush()

            b_item = Budget(
                trip_id=trip.id,
                category=BudgetCategory.TRANSPORTATION,
                estimated_amount=15000.0,
                actual_amount=0.0,
                notes="Hiace transport",
            )
            session.add(b_item)
            await session.commit()

            fetched_b = await session.get(Budget, b_item.id)
            assert fetched_b is not None
            assert fetched_b.trip_id == "trip-rel-1"
            assert fetched_b.estimated_amount == 15000.0

    run_async(_test())


def test_organizer_and_package_relationship(run_async, test_db_session):
    """Verify Organizer and Package relationship."""
    async def _test():
        async with test_db_session() as session:
            org = Organizer(
                id="org-rel-test",
                name="Karakoram Treks",
                contact_email="karakoram@friday.pk",
                is_verified=True,
                verification_status="PLATFORM_CURATED",
                rating=4.9,
            )
            session.add(org)
            await session.flush()

            pkg = Package(
                id="pkg-rel-test",
                organizer_id=org.id,
                title="Hunza 5D Expedition",
                destination="Hunza",
                duration_days=5,
                price_per_person=35000.0,
                max_travelers=12,
            )
            session.add(pkg)
            await session.commit()

            fetched_pkg = await session.get(Package, "pkg-rel-test")
            assert fetched_pkg is not None
            assert fetched_pkg.organizer_id == "org-rel-test"

    run_async(_test())


def test_booking_model_lifecycle(run_async, test_db_session):
    """Verify Booking status transitions."""
    async def _test():
        async with test_db_session() as session:
            user = User(id="user-book-rel", email="book_rel@friday.pk", name="Booking User")
            session.add(user)
            org = Organizer(id="org-book-rel", name="Booking Org")
            session.add(org)
            trip = Trip(id="trip-book-rel", owner_id=user.id, destination="Hunza")
            session.add(trip)
            pkg = Package(id="pkg-book-rel", organizer_id=org.id, title="Hunza Tour", destination="Hunza", duration_days=3, price_per_person=20000.0)
            session.add(pkg)
            await session.flush()

            booking = Booking(
                id="book-model-1",
                trip_id=trip.id,
                package_id=pkg.id,
                user_id=user.id,
                organizer_id=org.id,
                travelers=2,
                total_price=40000.0,
                status=BookingStatus.PENDING,
            )
            session.add(booking)
            await session.commit()

            fetched = await session.get(Booking, "book-model-1")
            assert fetched.status == BookingStatus.PENDING

            # Transition to CONFIRMED
            fetched.status = BookingStatus.CONFIRMED
            await session.commit()

            updated = await session.get(Booking, "book-model-1")
            assert updated.status == BookingStatus.CONFIRMED

    run_async(_test())
