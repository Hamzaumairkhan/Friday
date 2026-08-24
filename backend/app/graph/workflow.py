"""LangGraph workflow definition and compilation."""

from typing import Dict, Any, Optional
from langgraph.graph import StateGraph, END
from app.graph.state import AgentState
from app.graph.nodes import (
    node_conversation,
    node_research,
    node_planner,
    node_budget,
    node_replanner,
    node_marketplace,
    node_respond,
)
from app.core.logging import get_logger

logger = get_logger("graph.workflow")


def route_after_conversation(state: AgentState) -> str:
    """Conditional router based on analyzed intent."""
    intent = state.get("intent", "")
    if intent == "plan_trip":
        return "research"
    elif intent.startswith("replan_"):
        return "replanner"
    elif intent in ("match_organizer", "book_organizer"):
        return "marketplace"
    elif intent.startswith("research_"):
        return "research"
    else:
        return "respond"


def build_friday_graph():
    """Build and compile the Friday LangGraph workflow."""
    workflow = StateGraph(AgentState)

    # Add nodes
    workflow.add_node("conversation", node_conversation)
    workflow.add_node("research", node_research)
    workflow.add_node("planner", node_planner)
    workflow.add_node("budget", node_budget)
    workflow.add_node("replanner", node_replanner)
    workflow.add_node("marketplace", node_marketplace)
    workflow.add_node("respond", node_respond)

    # Entry point
    workflow.set_entry_point("conversation")

    # Conditional branching from conversation
    workflow.add_conditional_edges(
        "conversation",
        route_after_conversation,
        {
            "research": "research",
            "replanner": "replanner",
            "marketplace": "marketplace",
            "respond": "respond",
        },
    )

    # Planning pipeline: research -> planner -> budget -> respond
    workflow.add_edge("research", "planner")
    workflow.add_edge("planner", "budget")
    workflow.add_edge("budget", "respond")

    # Replanning pipeline: replanner -> respond
    workflow.add_edge("replanner", "respond")

    # Marketplace pipeline: marketplace -> respond
    workflow.add_edge("marketplace", "respond")

    # Final edge
    workflow.add_edge("respond", END)

    return workflow.compile()


# Compiled singleton graph
friday_graph = build_friday_graph()


async def execute_friday_workflow(
    user_message: str,
    user_id: str,
    conversation_id: Optional[str] = None,
    trip_id: Optional[str] = None,
    trip_state: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Execute the compiled LangGraph workflow with input state."""
    initial_state: AgentState = {
        "user_id": user_id,
        "user_message": user_message,
        "conversation_id": conversation_id,
        "trip_id": trip_id,
        "trip_state": trip_state,
        "actions_taken": [],
    }

    logger.info(f"Executing Friday graph for user={user_id}, trip={trip_id}")
    final_state = await friday_graph.ainvoke(initial_state)
    return final_state
