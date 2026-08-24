"""Friday Orchestrator — decides routing, tool invocations, and agent handoffs."""

from typing import Dict, Any, List
from app.agents.conversation_agent import ConversationAgent
from app.agents.research_agent import ResearchAgent
from app.agents.planner_agent import PlannerAgent
from app.agents.budget_agent import BudgetAgent
from app.agents.replanner_agent import ReplannerAgent
from app.core.logging import get_logger

logger = get_logger("agents.orchestrator")


class Orchestrator:
    """Master controller determining which agents/tools to execute for incoming requests."""

    @classmethod
    def route_request(cls, intent: str) -> str:
        """Route to appropriate execution branch."""
        if intent == "plan_trip":
            return "node_research"
        elif intent in ("replan_budget", "replan_duration", "replan_destination", "replan_general"):
            return "node_replan"
        elif intent in ("match_organizer", "book_organizer"):
            return "node_marketplace"
        elif intent.startswith("research_"):
            return "node_research"
        else:
            return "node_respond"
