"""Tests proving database initialization and seeding are 100% idempotent and duplicate-free."""

import pytest
from sqlalchemy import select, func
from app.database.seed import seed_initial_data_async, DEMO_USERS, DEMO_ORGANIZERS, DEMO_PACKAGES
from app.models.organizer import Organizer
from app.models.package import Package
from app.models.user import User
from tests.conftest import TestSessionLocal


def test_repeated_seeding_idempotency(run_async):
    """Verify that calling seed_initial_data_async 5 times produces ZERO errors and NO duplicates."""
    async def _test():
        # Call seed 5 consecutive times
        async with TestSessionLocal() as session:
            for _ in range(5):
                await seed_initial_data_async(session=session)

        # Verify exact record counts
        async with TestSessionLocal() as session:
            users_count = (await session.execute(select(func.count(User.id)))).scalar()
            orgs_count = (await session.execute(select(func.count(Organizer.id)))).scalar()
            pkgs_count = (await session.execute(select(func.count(Package.id)))).scalar()

            assert users_count == len(DEMO_USERS), f"Expected {len(DEMO_USERS)} user(s), found {users_count}"
            assert orgs_count == len(DEMO_ORGANIZERS), f"Expected {len(DEMO_ORGANIZERS)} organizers, found {orgs_count}"
            assert pkgs_count == len(DEMO_PACKAGES), f"Expected {len(DEMO_PACKAGES)} packages, found {pkgs_count}"

            # Verify specific organizer details
            hunza_org = await session.get(Organizer, "org-hunza-explorers")
            assert hunza_org is not None
            assert hunza_org.name == "Hunza Explorers & Treks"
            assert hunza_org.rating == 4.9

    run_async(_test())
