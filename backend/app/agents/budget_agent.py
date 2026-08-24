"""Budget Agent — performs deterministic budget calculations and breakdowns."""

from typing import Dict, Any, List, Optional
from app.services.budget_service import BudgetService
from app.core.logging import get_logger

logger = get_logger("agents.budget")


class BudgetAgent:
    """Calculates deterministic budget items and summaries for TripState."""

    @classmethod
    def run(
        cls,
        trip_id: str,
        destination: str,
        duration: int,
        travelers: int = 1,
        budget_total: Optional[float] = None,
        style: str = "standard",
    ) -> Dict[str, Any]:
        logger.info(f"Budget agent running for trip={trip_id} (total={budget_total}, travelers={travelers})")

        items = BudgetService.estimate_budget_breakdown(
            destination=destination,
            duration_days=duration,
            travelers=travelers,
            target_budget_total=budget_total,
            style=style,
        )

        summary = BudgetService.calculate_summary(
            trip_id=trip_id,
            total_budget_limit=budget_total,
            budget_items=items,
            travelers=travelers,
        )

        return {
            "items": items,
            "summary": summary.model_dump(),
        }
