"""Replanner agent supporting dynamic constraint replanning and weather-aware replanning."""

from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime

from app.services.budget_service import BudgetService
from app.llm.base import TaskType
from app.llm.router import get_llm_router
from app.core.logging import get_logger

logger = get_logger("agents.replanner")


class ReplannerAgent:
    """Agent that adapts existing trip plans to constraint changes and live weather hazards."""

    def __init__(self):
        self.router = get_llm_router()

    @classmethod
    def replan_budget(
        cls,
        current_trip_state: Dict[str, Any],
        new_budget_per_person: float,
        reason: str = "Budget update",
    ) -> Tuple[Dict[str, Any], List[Dict[str, Any]], Dict[str, Any]]:
        """Synchronous/Deterministic adapter for budget replanning."""
        updated_state = dict(current_trip_state)
        travelers = updated_state.get("travelers", 1) or 1
        duration = updated_state.get("duration", 4) or 4
        old_version = updated_state.get("version", 1)
        old_total = updated_state.get("budget_total", 0.0)

        # 1. Update budget fields
        new_total = new_budget_per_person * travelers
        updated_state["budget_per_person"] = new_budget_per_person
        updated_state["budget_total"] = new_total
        new_version = old_version + 1
        updated_state["version"] = new_version

        # 2. Adjust tiers based on budget constraints
        modifications = []
        if new_budget_per_person < 30000:
            updated_state["hotel_tier"] = "Budget Guest House / Homestay"
            updated_state["transport_tier"] = "Grand Cabin / Shared Coaster"
            modifications.append({
                "component": "Accommodation",
                "change": "Adjusted to Budget Guest House / Standard Homestay",
                "reason": "Optimize nightly costs to stay within updated budget.",
            })
            modifications.append({
                "component": "Transportation",
                "change": "Adjusted to Fuel-efficient AC Van / Shared Grand Cabin",
                "reason": "Reduced transit overhead.",
            })
        elif new_budget_per_person > 60000:
            updated_state["hotel_tier"] = "Luxury Resort / Serena Inn"
            updated_state["transport_tier"] = "Private 4x4 Prado / Dedicated SUV"
            modifications.append({
                "component": "Accommodation",
                "change": "Upgraded to 4/5-Star Luxury Resort",
                "reason": "Expanded budget allocation for premium comfort.",
            })
        else:
            updated_state["hotel_tier"] = "Standard 3-Star Hotel"
            updated_state["transport_tier"] = "Private AC Saloon / Car"
            modifications.append({
                "component": "Transportation",
                "change": "Standard Private AC Saloon / Car",
                "reason": "Optimal balance of comfort and value.",
            })

        # 3. Deterministic Budget Recalculation (No LLM arithmetic)
        new_budget_calc = BudgetService.calculate_trip_budget(
            total_budget=new_total,
            travelers=travelers,
            duration_days=duration,
        )
        updated_state["budget_breakdown"] = new_budget_calc

        totals = {
            "old_version": old_version,
            "new_version": new_version,
            "old_total": old_total,
            "new_total": new_total,
        }

        return updated_state, modifications, totals

    async def replan_for_weather(
        self,
        current_state: Dict[str, Any],
        weather_forecast: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Detect rain/storm hazards in the weather forecast and substitute outdoor activities."""
        updated_state = dict(current_state)
        itinerary = updated_state.get("itinerary", {})
        days = itinerary.get("days", [])
        weather_changes = []

        for i, day in enumerate(days):
            if i < len(weather_forecast):
                day_weather = weather_forecast[i]
                cond = day_weather.get("condition", "").lower()
                pop = day_weather.get("pop", 0)

                # Detect rain / storm hazard
                if "rain" in cond or "thunder" in cond or "snow" in cond or pop > 60:
                    for act in day.get("activities", []):
                        if act.get("category") in ("ADVENTURE", "SIGHTSEEING") and "outdoor" in act.get("notes", "").lower():
                            old_title = act["title"]
                            act["title"] = f"{act['title']} (Indoor Cultural Alternative / Museum)"
                            act["notes"] = f"Shifted to sheltered indoor tour due to forecasted {day_weather.get('description', cond)}."
                            weather_changes.append({
                                "day_number": day.get("day_number", i + 1),
                                "original_activity": old_title,
                                "new_activity": act["title"],
                                "reason": f"Heavy {cond} expected (Precipitation chance: {pop}%).",
                            })

        if weather_changes:
            old_version = updated_state.get("version", 1)
            updated_state["version"] = old_version + 1
            updated_state["weather_adjustments"] = weather_changes
            logger.info(f"Weather-aware replan applied {len(weather_changes)} adjustments for bad weather.")

        return updated_state
