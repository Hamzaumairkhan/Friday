"""Tests for budget <-> itinerary cost reconciliation across 1-day and multi-day trips."""

import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.services.dynamic_research_service import DynamicDestinationResearchService


@pytest.mark.asyncio
async def test_multan_islamabad_1day_reconciliation():
    """
    Multan -> Islamabad -> Multan (1 day, budget PKR 7,750):
    Budget:
      Transport = PKR 3,100
      Accommodation = PKR 0
      Food = PKR 2,325
      Activities = PKR 1,550
      Contingency = PKR 775
      Total = PKR 7,750
    Itinerary:
      Planned itinerary cost = 3,100 + 2,325 + 1,550 = 6,975
      Planned itinerary cost + contingency (775) = 7,750
      Transport items == 3,100
      Food items == 2,325
      Activities items == 1,550
      Accommodation items == 0
    """
    bd = DynamicDestinationResearchService.calculate_budget_breakdown(
        budget_total=7750,
        duration_days=1,
        accommodation_preference="comfortable",
    )
    assert bd["total"] == 7750
    assert bd["transport"] == 3100
    assert bd["accommodation"] == 0
    assert bd["food"] == 2325
    assert bd["activities"] == 1550
    assert bd["other"] == 775
    assert bd["transport"] + bd["accommodation"] + bd["food"] + bd["activities"] + bd["other"] == 7750

    days_data, _ = await DynamicDestinationResearchService.generate_dynamic_itinerary_days(
        destination="Islamabad",
        origin="Multan",
        duration_days=1,
        budget_total=7750,
        accommodation_preference="comfortable",
    )
    assert len(days_data) == 1
    acts = days_data[0]["activities"]

    trans_sum = sum(a["estimated_cost"] for a in acts if a["category"] == "TRANSPORT")
    accom_sum = sum(a["estimated_cost"] for a in acts if a["category"] == "ACCOMMODATION")
    food_sum = sum(a["estimated_cost"] for a in acts if a["category"] == "FOOD")
    acts_sum = sum(a["estimated_cost"] for a in acts if a["category"] not in ("TRANSPORT", "ACCOMMODATION", "FOOD"))

    assert trans_sum == 3100, f"Transport expected 3100, got {trans_sum}"
    assert accom_sum == 0, f"Accommodation expected 0, got {accom_sum}"
    assert food_sum == 2325, f"Food expected 2325, got {food_sum}"
    assert acts_sum == 1550, f"Activities expected 1550, got {acts_sum}"

    total_itin = trans_sum + accom_sum + food_sum + acts_sum
    assert total_itin == 6975, f"Planned itinerary cost expected 6975, got {total_itin}"
    assert total_itin + bd["other"] == 7750, "sum(itinerary) + contingency != total budget"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "dest,origin,days,budget,pref",
    [
        ("Multan", "Islamabad", 1, 7750, "comfortable"),
        ("Islamabad", "Islamabad", 3, 30000, "comfortable"),
        ("Hunza", "Islamabad", 3, 60000, "comfortable"),
        ("Skardu", "Islamabad", 3, 75000, "luxury"),
    ],
)
async def test_reconciliation_four_required_destinations(dest, origin, days, budget, pref):
    """Verify sum(itinerary) + contingency == total budget for all required destinations."""
    bd = DynamicDestinationResearchService.calculate_budget_breakdown(
        budget_total=budget,
        duration_days=days,
        accommodation_preference=pref,
    )
    assert bd["transport"] + bd["accommodation"] + bd["food"] + bd["activities"] + bd["other"] == round(budget)

    days_data, _ = await DynamicDestinationResearchService.generate_dynamic_itinerary_days(
        destination=dest,
        origin=origin,
        duration_days=days,
        budget_total=budget,
        accommodation_preference=pref,
    )
    assert len(days_data) == days

    all_acts = [a for d in days_data for a in d["activities"]]
    trans_sum = sum(a["estimated_cost"] for a in all_acts if a["category"] == "TRANSPORT")
    accom_sum = sum(a["estimated_cost"] for a in all_acts if a["category"] == "ACCOMMODATION")
    food_sum = sum(a["estimated_cost"] for a in all_acts if a["category"] == "FOOD")
    acts_sum = sum(a["estimated_cost"] for a in all_acts if a["category"] not in ("TRANSPORT", "ACCOMMODATION", "FOOD"))

    assert trans_sum == bd["transport"], f"Transport mismatch: {trans_sum} vs {bd['transport']}"
    assert accom_sum == bd["accommodation"], f"Accommodation mismatch: {accom_sum} vs {bd['accommodation']}"
    assert food_sum == bd["food"], f"Food mismatch: {food_sum} vs {bd['food']}"
    assert acts_sum == bd["activities"], f"Activities mismatch: {acts_sum} vs {bd['activities']}"

    total_itin = sum(a["estimated_cost"] for a in all_acts)
    assert total_itin + bd["other"] == round(budget), f"Total mismatch: {total_itin} + {bd['other']} != {budget}"


def test_guided_plan_api_reconciliation(run_async, auth_headers):
    """Test full API /api/v1/trips/guided-plan workflow and DB consistency."""
    async def _test():
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            payload = {
                "destination": "Islamabad",
                "origin": "Multan",
                "duration_days": 1,
                "travelers": 1,
                "budget": 7750,
                "budget_type": "total",
                "accommodation_preference": "comfortable",
            }
            res = await client.post("/api/v1/trips/guided-plan", json=payload, headers=auth_headers)
            assert res.status_code == 201
            data = res.json()

            bd = data["budget_breakdown"]
            assert bd["total"] == 7750
            assert bd["transport"] == 3100
            assert bd["accommodation"] == 0
            assert bd["food"] == 2325
            assert bd["activities"] == 1550
            assert bd["other"] == 775

            days = data["itinerary"]["days"]
            assert len(days) == 1
            acts = days[0]["activities"]

            trans_sum = sum(a["estimated_cost"] for a in acts if a["category"] == "TRANSPORT")
            accom_sum = sum(a["estimated_cost"] for a in acts if a["category"] == "ACCOMMODATION")
            food_sum = sum(a["estimated_cost"] for a in acts if a["category"] == "FOOD")
            acts_sum = sum(a["estimated_cost"] for a in acts if a["category"] not in ("TRANSPORT", "ACCOMMODATION", "FOOD"))

            assert trans_sum == 3100
            assert accom_sum == 0
            assert food_sum == 2325
            assert acts_sum == 1550

            total_itin = sum(a["estimated_cost"] for a in acts)
            assert total_itin == 6975
            assert total_itin + bd["other"] == 7750

    run_async(_test())
