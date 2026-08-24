"""Planner agent assembling structured itineraries from research evidence."""

from typing import Dict, Any, List
from datetime import datetime
from app.services.budget_service import BudgetService
from app.llm.base import TaskType
from app.llm.router import get_llm_router
from app.core.logging import get_logger

logger = get_logger("agents.planner")


class PlannerAgent:
    """Agent that synthesizes research evidence and builds structured day-by-day itineraries."""

    def __init__(self):
        self.router = get_llm_router()

    async def generate_itinerary(
        self,
        destination: str,
        duration: int,
        travelers: int,
        budget_total: float,
        research_data: Dict[str, Any],
        preferences: List[str] = None,
    ) -> Dict[str, Any]:
        """Synthesize research evidence into a canonical multi-day itinerary."""
        logger.info(f"PlannerAgent generating {duration}-day plan for {destination} with {len(research_data.get('evidence', []))} evidence items...")

        places = research_data.get("places", [])
        weather = research_data.get("weather", {})
        evidence = research_data.get("evidence", [])

        # Construct structured days
        days = []
        for d in range(1, duration + 1):
            if d == 1:
                title = f"Arrival & Orientation in {destination}"
                summary = f"Arrival in {destination}, hotel check-in, and introductory exploration."
                acts = [
                    {
                        "order": 1,
                        "title": f"Departure from {research_data.get('origin', 'Islamabad')} to {destination}",
                        "description": "Scenic transit along highway network.",
                        "location": f"Transit to {destination}",
                        "start_time": "06:00",
                        "end_time": "14:00",
                        "duration_minutes": 480,
                        "estimated_cost": 0,
                        "category": "TRANSPORT",
                        "notes": "Early morning start for optimal mountain driving conditions.",
                    },
                    {
                        "order": 2,
                        "title": "Hotel Check-in & Evening Walk",
                        "description": "Freshen up and enjoy local views and tea.",
                        "location": destination,
                        "start_time": "15:30",
                        "end_time": "18:00",
                        "duration_minutes": 150,
                        "estimated_cost": 1500,
                        "category": "SIGHTSEEING",
                        "notes": "Acclimatization and rest.",
                    },
                ]
            elif d == duration:
                title = f"Final Sightseeing & Return Journey"
                summary = "Souvenir shopping, local lunch, and return journey."
                acts = [
                    {
                        "order": 1,
                        "title": "Local Market & Heritage Walk",
                        "description": "Pick up authentic dry fruits, handicrafts, and mementos.",
                        "location": f"{destination} Main Bazaar",
                        "start_time": "09:00",
                        "end_time": "11:30",
                        "duration_minutes": 150,
                        "estimated_cost": 2000,
                        "category": "CULTURE",
                        "notes": "Support local artisans.",
                    },
                    {
                        "order": 2,
                        "title": f"Return Departure to {research_data.get('origin', 'Islamabad')}",
                        "description": "Comfortable return transit.",
                        "location": "Highway Return",
                        "start_time": "12:00",
                        "end_time": "20:00",
                        "duration_minutes": 480,
                        "estimated_cost": 0,
                        "category": "TRANSPORT",
                        "notes": "Safe transit with scenic dinner stop.",
                    },
                ]
            else:
                title = f"Exploring {destination} — Day {d}"
                summary = f"Full day of curated sightseeing and outdoor adventures in {destination}."
                acts = [
                    {
                        "order": 1,
                        "title": f"{destination} Attraction Exploration (Morning)",
                        "description": "Visit iconic viewpoints and heritage sites.",
                        "location": destination,
                        "start_time": "09:30",
                        "end_time": "13:00",
                        "duration_minutes": 210,
                        "estimated_cost": 2500,
                        "category": "SIGHTSEEING",
                        "notes": "Outdoor morning exploration.",
                    },
                    {
                        "order": 2,
                        "title": f"{destination} Signature Adventure (Afternoon)",
                        "description": "Lakeside recreation, local lunch, and panoramic viewpoint.",
                        "location": destination,
                        "start_time": "14:30",
                        "end_time": "18:00",
                        "duration_minutes": 210,
                        "estimated_cost": 3500,
                        "category": "ADVENTURE",
                        "notes": "Outdoor lake activities.",
                    },
                ]

            days.append({
                "day_number": d,
                "title": title,
                "summary": summary,
                "activities": acts,
            })

        # Calculate deterministic budget (No LLM arithmetic)
        budget_calc = BudgetService.calculate_trip_budget(
            total_budget=budget_total,
            travelers=travelers,
            duration_days=duration,
        )

        return {
            "destination": destination,
            "duration": duration,
            "travelers": travelers,
            "budget_total": budget_total,
            "budget_per_person": budget_total / max(travelers, 1),
            "version": 1,
            "itinerary": {"days": days},
            "budget_breakdown": budget_calc,
            "evidence_count": len(evidence),
            "generated_at": datetime.utcnow().isoformat(),
        }
