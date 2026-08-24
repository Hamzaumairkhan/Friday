"""LangGraph node execution functions for Friday multi-agent architecture with resilience against partial tool failures."""

from typing import Dict, Any, List
from app.graph.state import AgentState
from app.agents.conversation_agent import ConversationAgent
from app.agents.research_agent import ResearchAgent
from app.agents.planner_agent import PlannerAgent
from app.agents.replanner_agent import ReplannerAgent
from app.tools.organizers import OrganizersTool
from app.services.budget_service import BudgetService
from app.core.logging import get_logger

logger = get_logger("graph.nodes")


async def node_conversation(state: AgentState) -> Dict[str, Any]:
    """Node 1: Parse user message, extract travel slots, and detect intent."""
    msg = state.get("user_message", "")
    trip_state = state.get("trip_state") or {}

    agent = ConversationAgent()
    try:
        parsed = await agent.parse_user_message(msg)
        intent = parsed.get("intent", "plan_trip")
        entities = parsed.get("entities", {})
    except Exception as e:
        logger.warning(f"Conversation parsing exception: {e}. Falling back to default extraction.")
        intent = "plan_trip"
        entities = {"destination": "Hunza", "duration": 4, "travelers": 2}

    # Intent overrides for replan requests
    msg_lower = msg.lower()
    if trip_state and "budget" in msg_lower and ("kardo" in msg_lower or "kar do" in msg_lower or "kam" in msg_lower or "barha" in msg_lower or "change" in msg_lower or "reduce" in msg_lower):
        intent = "replan_budget"
    elif "organizer" in msg_lower or "marketplace" in msg_lower or "package" in msg_lower or "book" in msg_lower:
        intent = "match_organizer"

    actions = state.get("actions_taken", [])
    actions.append(f"ConversationAgent: Detected intent '{intent}' with entities {list(entities.keys())}")

    return {
        "intent": intent,
        "extracted_entities": entities,
        "actions_taken": actions,
    }


async def node_research(state: AgentState) -> Dict[str, Any]:
    """Node 2: Fetch destination details, weather, routes, places, hotels with partial failure resilience."""
    entities = state.get("extracted_entities", {})
    trip_state = state.get("trip_state") or {}

    dest = entities.get("destination") or trip_state.get("destination") or "Hunza"
    origin = entities.get("origin") or trip_state.get("origin") or "Islamabad"
    duration = entities.get("duration") or trip_state.get("duration") or 4
    budget_pp = entities.get("budget_per_person") or trip_state.get("budget_per_person") or 40000.0

    agent = ResearchAgent()
    try:
        research = await agent.gather_destination_intel(
            destination=dest,
            origin=origin,
            duration=duration,
            budget_per_person=budget_pp,
        )
    except Exception as e:
        logger.error(f"Research gathering encountered an error: {e}. Providing safe fallback evidence.")
        research = {
            "destination": dest,
            "origin": origin,
            "duration": duration,
            "evidence": [],
            "error_note": f"Partial tool error: {str(e)}",
        }

    actions = state.get("actions_taken", [])
    actions.append(f"ResearchAgent: Gathered multi-source evidence ({len(research.get('evidence', []))} items) for {dest}")

    return {
        "research_data": research,
        "actions_taken": actions,
    }


async def node_planner(state: AgentState) -> Dict[str, Any]:
    """Node 3: Assemble structured itinerary synthesizing research evidence."""
    entities = state.get("extracted_entities", {})
    trip_state = state.get("trip_state") or {}
    research = state.get("research_data") or {}

    dest = entities.get("destination") or trip_state.get("destination") or "Hunza"
    duration = entities.get("duration") or trip_state.get("duration") or 4
    travelers = entities.get("travelers") or trip_state.get("travelers") or 1
    budget_pp = entities.get("budget_per_person") or trip_state.get("budget_per_person") or 40000.0
    budget_total = entities.get("budget_total") or (budget_pp * travelers)

    agent = PlannerAgent()
    try:
        planned_data = await agent.generate_itinerary(
            destination=dest,
            duration=duration,
            travelers=travelers,
            budget_total=budget_total,
            research_data=research,
        )
        itinerary = planned_data.get("itinerary")
    except Exception as e:
        logger.error(f"Planner itinerary generation error: {e}. Building fallback itinerary days.")
        itinerary = [
            {"day_number": i + 1, "title": f"Day {i + 1} Exploration in {dest}", "summary": f"Highlights and cultural immersion across {dest}."}
            for i in range(duration)
        ]

    actions = state.get("actions_taken", [])
    actions.append(f"PlannerAgent: Generated {duration}-day structured itinerary for {dest}")

    return {
        "itinerary": itinerary,
        "actions_taken": actions,
    }


async def node_budget(state: AgentState) -> Dict[str, Any]:
    """Node 4: Compute deterministic budget breakdown in Python (no LLM arithmetic)."""
    entities = state.get("extracted_entities", {})
    trip_state = state.get("trip_state") or {}

    dest = entities.get("destination") or trip_state.get("destination") or "Hunza"
    duration = entities.get("duration") or trip_state.get("duration") or 4
    travelers = entities.get("travelers") or trip_state.get("travelers") or 1
    budget_pp = entities.get("budget_per_person") or trip_state.get("budget_per_person") or 40000.0
    budget_total = entities.get("budget_total") or (budget_pp * travelers)
    trip_id = state.get("trip_id") or "new-trip"

    budget_breakdown = BudgetService.calculate_trip_budget(
        total_budget=budget_total,
        travelers=travelers,
        duration_days=duration,
        destination=dest,
    )

    updated_trip_state = {
        "trip_id": trip_id,
        "destination": dest,
        "origin": entities.get("origin") or trip_state.get("origin", "Islamabad"),
        "duration": duration,
        "travelers": travelers,
        "budget_total": budget_total,
        "budget_per_person": budget_pp,
        "itinerary": state.get("itinerary"),
        "budget_breakdown": budget_breakdown,
        "weather": (state.get("research_data") or {}).get("weather"),
        "version": trip_state.get("version", 1),
    }

    actions = state.get("actions_taken", [])
    actions.append(f"BudgetService: Computed deterministic breakdown (Total: Rs. {budget_total:,.0f})")

    return {
        "trip_state": updated_trip_state,
        "actions_taken": actions,
    }


async def node_replanner(state: AgentState) -> Dict[str, Any]:
    """Node 5: Execute dynamic replanning on existing trip without regenerating everything."""
    trip_state = state.get("trip_state") or {}
    entities = state.get("extracted_entities", {})

    new_budget_pp = entities.get("budget_per_person") or 30000.0
    updated_state, changes, totals = ReplannerAgent.replan_budget(
        current_trip_state=trip_state,
        new_budget_per_person=new_budget_pp,
    )

    actions = state.get("actions_taken", [])
    actions.append(f"ReplannerAgent: Dynamically modified budget to Rs. {new_budget_pp:,.0f}/person (v{totals['old_version']} → v{totals['new_version']})")

    return {
        "trip_state": updated_state,
        "replan_changes": changes,
        "old_version": totals["old_version"],
        "new_version": totals["new_version"],
        "actions_taken": actions,
    }


async def node_marketplace(state: AgentState) -> Dict[str, Any]:
    """Node 6: Query verified & platform-curated local Pakistani tour operators matching trip parameters."""
    trip_state = state.get("trip_state") or {}
    entities = state.get("extracted_entities", {})

    dest = entities.get("destination") or trip_state.get("destination") or "Hunza"
    budget_pp = entities.get("budget_per_person") or trip_state.get("budget_per_person")

    tool = OrganizersTool()
    org_res = await tool.search_organizers(destination=dest, budget_per_person=budget_pp)
    matches = org_res.get("data", [])

    actions = state.get("actions_taken", [])
    actions.append(f"MarketplaceAgent: Matched {len(matches)} organizer options for destination '{dest}'")

    return {
        "organizer_matches": matches,
        "actions_taken": actions,
    }


async def node_respond(state: AgentState) -> Dict[str, Any]:
    """Node 7: Format conversational response explaining results."""
    intent = state.get("intent", "")
    trip_state = state.get("trip_state") or {}
    changes = state.get("replan_changes") or []
    org_matches = state.get("organizer_matches") or []

    if intent == "plan_trip":
        dest = trip_state.get("destination", "Northern Pakistan")
        dur = trip_state.get("duration", 4)
        trav = trip_state.get("travelers", 1)
        b_pp = trip_state.get("budget_per_person")
        b_str = f"with a budget of Rs. {b_pp:,.0f}/person (Total: Rs. {trip_state.get('budget_total', 0):,.0f})" if b_pp else ""

        response_text = (
            f"✅ **Zabardast! Main ne aapka {dur}-Day Trip Plan kar diya hai for {dest}** ({trav} traveler{'s' if trav > 1 else ''} {b_str}).\n\n"
            f"📍 **Highlights:**\n"
            f"- Structured Day-by-Day Itinerary created\n"
            f"- Live Weather advisory and route guidelines attached\n"
            f"- Deterministic budget breakdown allocated across Transport, Hotels, Food & Activities\n\n"
            f"Aap kisi bhi waqt keh sakte hain: *'Budget 30k kar do'* ya *'Show trusted organizers'*."
        )

    elif intent.startswith("replan"):
        old_v = state.get("old_version", 1)
        new_v = state.get("new_version", 2)
        b_pp = trip_state.get("budget_per_person", 0)
        total = trip_state.get("budget_total", 0)

        change_bullets = "\n".join([f"- **{c.get('component', 'Plan')}**: {c.get('change', '')} ({c.get('reason', '')})" for c in changes])
        response_text = (
            f"🔄 **Trip Replan Successful (Version {old_v} ➔ {new_v})**\n\n"
            f"Aapka budget update kar diya gaya hai to **Rs. {b_pp:,.0f} per person** (Total: Rs. {total:,.0f}).\n\n"
            f"**Adjustments Made Without Breaking Your Itinerary:**\n"
            f"{change_bullets if change_bullets else '- Budget allocations re-balanced deterministically'}\n\n"
            f"Kya aap is naye plan ke liye verified local organizers dekhna chahte hain?"
        )

    elif intent in ("match_organizer", "search_organizers"):
        count = len(org_matches)
        dest = trip_state.get("destination") or "Pakistan"
        response_text = (
            f"🎒 **Marketplace Matches for {dest} ({count} Options Found)**\n\n"
            f"Main ne aapke budget aur travel requirements ke mutabiq local Pakistani tour organizers filter kiye hain. "
            f"Aap direct inke packages dekh sakte hain aur reservation request send kar sakte hain."
        )

    elif intent == "greeting":
        response_text = "Salam! Main Friday hoon — aapka AI Travel Copilot for Pakistan. Mujhe batayein kahan jana chahte hain? (e.g. *'Mujhe 5 friends ke sath 4 din ke liye Hunza jana hai, budget 40k per person'*)"

    else:
        response_text = "Main aapki madad kar sakta hoon trip planning, budget replanning, weather checks, aur verified local organizers dhoondhne mein."

    return {
        "agent_response": response_text,
    }
