"""Tests for Marketplace matching and Organizer recommendations."""

from httpx import AsyncClient, ASGITransport
from app.main import app
from app.models.organizer import Organizer
from app.models.package import Package
from tests.conftest import TestSessionLocal


async def _create_test_marketplace_data(session):
    for i in range(3):
        org_id = f"test-org-{i}"
        existing = await session.get(Organizer, org_id)
        if not existing:
            session.add(Organizer(
                id=org_id,
                name=f"Test Host {i}",
                contact_email=f"host{i}@test.pk",
                destinations=["Hunza", "Skardu"],
                is_verified=True,
            ))
    for j in range(4):
        pkg_id = f"test-pkg-{j}"
        existing_pkg = await session.get(Package, pkg_id)
        if not existing_pkg:
            session.add(Package(
                id=pkg_id,
                organizer_id="test-org-0",
                title=f"Test Tour {j}",
                destination="Hunza",
                duration_days=5,
                price_per_person=35000.0,
                is_active=True,
            ))
    await session.commit()


def test_marketplace_matching(run_async):
    async def _test():
        async with TestSessionLocal() as session:
            await _create_test_marketplace_data(session)

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            # Query list of organizers
            res = await client.get("/api/v1/organizers")
            assert res.status_code == 200
            orgs = res.json()
            assert len(orgs) >= 3

            # Query packages
            pkg_res = await client.get("/api/v1/packages")
            assert pkg_res.status_code == 200
            pkgs = pkg_res.json()
            assert len(pkgs) >= 4

    run_async(_test())


def test_organizer_match_for_trip(run_async, auth_headers):
    async def _test():
        async with TestSessionLocal() as session:
            await _create_test_marketplace_data(session)

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            # Create a trip to Hunza
            trip_res = await client.post(
                "/api/v1/trips",
                json={"destination": "Hunza", "duration": 4, "travelers": 5, "budget_per_person": 40000},
                headers=auth_headers,
            )
            trip_id = trip_res.json()["id"]

            # Match organizers
            match_res = await client.post(f"/api/v1/trips/{trip_id}/organizer-match", headers=auth_headers)
            assert match_res.status_code == 200
            matches = match_res.json()
            assert len(matches) > 0

            top_match = matches[0]
            assert top_match["match_score"] > 0.3
            assert len(top_match["reasons"]) > 0

    run_async(_test())
