"""Tests for Dynamic Replanning."""

from httpx import AsyncClient, ASGITransport
from app.main import app


def test_dynamic_replanning_budget_reduction(run_async, auth_headers):
    async def _test():
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            # 1. Create a trip with 40k budget/person
            create_payload = {
                "destination": "Hunza",
                "duration": 4,
                "travelers": 5,
                "budget_per_person": 40000,
            }
            res = await client.post("/api/v1/trips", json=create_payload, headers=auth_headers)
            trip_id = res.json()["id"]

            # 2. Replan via API: "Budget 30k kar do"
            replan_payload = {
                "message": "Budget 30k kar do",
                "changes": {"budget_per_person": 30000},
            }
            replan_res = await client.post(f"/api/v1/trips/{trip_id}/replan", json=replan_payload, headers=auth_headers)
            assert replan_res.status_code == 200
            data = replan_res.json()

            assert data["old_version"] == 1
            assert data["new_version"] == 2
            assert data["old_total"] == 200000.0
            assert data["new_total"] == 150000.0
            assert len(data["changes"]) > 0

            # 3. Verify trip state was updated in DB
            trip_res = await client.get(f"/api/v1/trips/{trip_id}", headers=auth_headers)
            assert trip_res.json()["budget_per_person"] == 30000.0
            assert trip_res.json()["budget_total"] == 150000.0
            assert trip_res.json()["version"] == 2

    run_async(_test())
