"""End-to-end travel planning workflows across major Pakistan destinations."""

import pytest
from app.graph.workflow import execute_friday_workflow
from app.agents.replanner_agent import ReplannerAgent


def test_workflow_hunza_trip(run_async):
    """End-to-end LangGraph planning for Hunza Valley."""
    async def _test():
        state = await execute_friday_workflow(
            user_message="I want to plan a 4-day trip to Hunza with 2 friends, budget 40k each",
            user_id="traveler-hunza",
        )
        assert state.get("intent") == "plan_trip"
        trip_state = state.get("trip_state")
        assert trip_state is not None
        assert "Hunza" in trip_state["destination"]
        assert len(trip_state["budget_breakdown"]) >= 4
        assert len(state.get("actions_taken", [])) >= 3

    run_async(_test())


def test_workflow_skardu_trip(run_async):
    """End-to-end LangGraph planning for Skardu."""
    async def _test():
        state = await execute_friday_workflow(
            user_message="Plan a 6-day expedition to Skardu and Deosai for 4 persons, 50k budget per person",
            user_id="traveler-skardu",
        )
        trip_state = state.get("trip_state")
        assert trip_state is not None
        assert "Skardu" in trip_state["destination"]
        assert trip_state["duration"] == 6

    run_async(_test())


def test_workflow_swat_trip(run_async):
    """End-to-end LangGraph planning for Swat Valley."""
    async def _test():
        state = await execute_friday_workflow(
            user_message="Swat and Malam Jabba 3-day trip for 2 people with 25000 budget each",
            user_id="traveler-swat",
        )
        trip_state = state.get("trip_state")
        assert trip_state is not None
        assert "Swat" in trip_state["destination"]
        assert trip_state["duration"] == 3

    run_async(_test())


def test_workflow_murree_trip(run_async):
    """End-to-end LangGraph planning for Murree & Galyat."""
    async def _test():
        state = await execute_friday_workflow(
            user_message="Weekend getaway to Murree for 2 days with 15k per person",
            user_id="traveler-murree",
        )
        trip_state = state.get("trip_state")
        assert trip_state is not None
        assert "Murree" in trip_state["destination"]

    run_async(_test())


def test_workflow_naran_trip(run_async):
    """End-to-end LangGraph planning for Naran & Saif-ul-Malook."""
    async def _test():
        state = await execute_friday_workflow(
            user_message="Naran Kaghan 4 days trip for 3 travelers with 35k budget per person",
            user_id="traveler-naran",
        )
        trip_state = state.get("trip_state")
        assert trip_state is not None
        assert "Naran" in trip_state["destination"]

    run_async(_test())


def test_workflow_dynamic_replanning_chain(run_async):
    """Workflow: Plan Hunza -> User reduces budget -> Replanner modifies budget preserving itinerary."""
    async def _test():
        # Step 1: Initial plan
        initial_state = await execute_friday_workflow(
            user_message="Plan 4-day Hunza trip for 2 people with 40k per person",
            user_id="traveler-replan",
        )
        t_state = initial_state.get("trip_state")
        assert t_state["budget_per_person"] == 40000.0

        # Step 2: Replanning request
        replan_state = await execute_friday_workflow(
            user_message="Budget kam karke 30000 kardo",
            user_id="traveler-replan",
            trip_state=t_state,
        )
        assert replan_state.get("intent") == "replan_budget"
        new_t_state = replan_state.get("trip_state")
        assert new_t_state["budget_per_person"] == 30000.0
        assert new_t_state["version"] == 2

    run_async(_test())
