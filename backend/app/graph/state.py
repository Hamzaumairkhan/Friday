"""LangGraph shared state definition for Friday AI workflows."""

from typing import TypedDict, Optional, List, Dict, Any, Annotated
from pydantic import BaseModel, Field


class AgentState(TypedDict, total=False):
    """LangGraph agent execution state across node transitions."""

    # User context
    user_id: str
    user_message: str
    conversation_id: Optional[str]
    trip_id: Optional[str]

    # Intent and extraction
    intent: str  # e.g., "plan_trip", "replan_budget", "replan_dates", "match_organizer", "ask_question", "general_chat"
    extracted_entities: Dict[str, Any]  # {destination, duration, travelers, budget_pp, budget_total, origin, preferences}

    # Core trip state
    trip_state: Optional[Dict[str, Any]]

    # Research and context
    research_data: Optional[Dict[str, Any]]

    # Replanning diffs
    replan_changes: Optional[List[Dict[str, Any]]]
    old_version: Optional[int]
    new_version: Optional[int]

    # Marketplace & Booking
    organizer_matches: Optional[List[Dict[str, Any]]]
    booking_proposal: Optional[Dict[str, Any]]

    # Response generation
    agent_response: str
    actions_taken: List[str]
    next_node: Optional[str]
