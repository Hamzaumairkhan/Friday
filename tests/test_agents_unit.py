"""Unit tests for specialized agent components."""

import pytest
from unittest.mock import AsyncMock
from app.agents.research_agent import ResearchAgent
from app.agents.planner_agent import PlannerAgent
from app.agents.budget_agent import BudgetAgent
from app.agents.booking_agent import BookingAgent
from app.agents.orchestrator import Orchestrator


def test_research_agent_gather_intel(run_async):
    """Verify research agent aggregates evidence from multiple tools."""
    async def _test():
        agent = ResearchAgent()
        intel = await agent.gather_destination_intel(
            destination="Hunza",
            origin="Islamabad",
            duration=4,
            budget_per_person=40000.0,
        )
        assert intel["destination"] == "Hunza"
        assert "evidence" in intel
        assert len(intel["evidence"]) >= 1

    run_async(_test())


def test_budget_agent_breakdown():
    """Verify budget agent produces deterministic allocation via BudgetAgent.run."""
    res = BudgetAgent.run(
        trip_id="trip-agent-test",
        destination="Skardu",
        duration=5,
        travelers=2,
        budget_total=100000.0,
    )
    assert "items" in res
    assert "summary" in res
    assert res["summary"]["total_estimated"] == 100000.0
    assert len(res["items"]) >= 4


def test_booking_agent_create_booking(run_async):
    """Verify booking agent calls booking service with BookingCreate schema."""
    async def _test():
        mock_booking_svc = AsyncMock()
        mock_booking_obj = AsyncMock()
        mock_booking_obj.id = "booking-12345"
        mock_booking_obj.status.value = "PENDING"
        mock_booking_obj.total_price = 76000.0
        mock_booking_obj.travelers = 2
        mock_booking_svc.create_booking_request.return_value = mock_booking_obj

        res = await BookingAgent.create_booking(
            booking_service=mock_booking_svc,
            user_id="traveler-1",
            trip_id="trip-1",
            package_id="pkg-hunza-4d",
            travelers=2,
            notes="No seafood",
        )
        assert res["booking_id"] == "booking-12345"
        assert res["total_price"] == 76000.0
        assert res["travelers"] == 2

    run_async(_test())


def test_orchestrator_routing():
    """Verify orchestrator routing decisions."""
    assert Orchestrator.route_request("plan_trip") == "node_research"
    assert Orchestrator.route_request("replan_budget") == "node_replan"
    assert Orchestrator.route_request("match_organizer") == "node_marketplace"
    assert Orchestrator.route_request("greeting") == "node_respond"
