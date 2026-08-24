"""Deterministic budget calculation and estimation service."""

from typing import Dict, Any, List, Optional
from app.models.budget import BudgetCategory
from app.schemas.budget import BudgetSummary, BudgetItemSchema


class BudgetService:
    """Pure Python deterministic engine for travel budget estimation and calculation."""

    # Baseline daily costs per person in PKR based on destination tier and style
    STYLE_MULTIPLIERS = {
        "budget": 0.6,
        "standard": 1.0,
        "luxury": 2.2,
    }

    @classmethod
    def calculate_summary(
        cls,
        trip_id: str,
        total_budget_limit: Optional[float],
        budget_items: List[Dict[str, Any]],
        travelers: int = 1,
    ) -> BudgetSummary:
        """Calculate totals, per-person rates, remaining, and over-budget status deterministically."""
        travelers = max(1, travelers)
        total_estimated = sum(item.get("estimated_amount", 0.0) for item in budget_items)
        per_person = total_estimated / travelers

        remaining = (total_budget_limit - total_estimated) if total_budget_limit is not None else 0.0
        over_budget = (total_estimated > total_budget_limit) if total_budget_limit is not None else False

        schemas = [
            BudgetItemSchema(
                category=item.get("category", "MISCELLANEOUS"),
                estimated_amount=round(item.get("estimated_amount", 0.0), 2),
                actual_amount=round(item.get("actual_amount", 0.0), 2),
                notes=item.get("notes"),
            )
            for item in budget_items
        ]

        return BudgetSummary(
            trip_id=trip_id,
            total_estimated=round(total_estimated, 2),
            total_per_person=round(per_person, 2),
            remaining=round(remaining, 2),
            over_budget=over_budget,
            categories=schemas,
        )

    @classmethod
    def calculate_trip_budget(
        cls,
        total_budget: float,
        travelers: int = 1,
        duration_days: int = 4,
        destination: str = "Pakistan",
    ) -> List[Dict[str, Any]]:
        """Proportionally allocate total budget across transportation, accommodation, food, activities, and misc."""
        return cls.estimate_budget_breakdown(
            destination=destination,
            duration_days=duration_days,
            travelers=travelers,
            target_budget_total=total_budget,
        )

    @classmethod
    def estimate_budget_breakdown(
        cls,
        destination: str,
        duration_days: int,
        travelers: int = 1,
        target_budget_total: Optional[float] = None,
        style: str = "standard",
    ) -> List[Dict[str, Any]]:
        """Generate an initial deterministic breakdown for standard Pakistan Northern areas."""
        travelers = max(1, travelers)
        duration = max(1, duration_days)

        if target_budget_total and target_budget_total > 0:
            # Proportionally allocate given budget
            # Transport: 25%, Accommodation: 35%, Food: 20%, Activities: 12%, Misc: 8%
            allocations = {
                BudgetCategory.TRANSPORTATION.value: 0.25,
                BudgetCategory.ACCOMMODATION.value: 0.35,
                BudgetCategory.FOOD.value: 0.20,
                BudgetCategory.ACTIVITIES.value: 0.12,
                BudgetCategory.MISCELLANEOUS.value: 0.08,
            }
            breakdown = []
            for cat, pct in allocations.items():
                amt = round(target_budget_total * pct, 2)
                breakdown.append({
                    "category": cat,
                    "estimated_amount": amt,
                    "actual_amount": 0.0,
                    "notes": f"Allocated {int(pct*100)}% of Rs. {target_budget_total:,.0f} budget for {travelers} pax ({duration} days).",
                })
            return breakdown

        # Default realistic baseline cost per person per day
        mult = cls.STYLE_MULTIPLIERS.get(style.lower(), 1.0)
        daily_hotel_per_room = 6000 * mult  # 2 people per room assumed
        rooms_needed = (travelers + 1) // 2
        hotel_total = daily_hotel_per_room * (duration - 1) * rooms_needed

        # Transport fixed + local
        transport_total = (12000 * (1 if travelers <= 4 else 2)) + (3500 * duration * mult)
        # Food per person per day
        food_total = 1800 * duration * travelers * mult
        # Activities & tickets
        activities_total = 1200 * duration * travelers
        # Misc / emergency
        misc_total = 1000 * duration * travelers

        return [
            {
                "category": BudgetCategory.TRANSPORTATION.value,
                "estimated_amount": round(transport_total, 2),
                "actual_amount": 0.0,
                "notes": f"Dedicated transport for {travelers} travelers across {duration} days",
            },
            {
                "category": BudgetCategory.ACCOMMODATION.value,
                "estimated_amount": round(hotel_total, 2),
                "actual_amount": 0.0,
                "notes": f"{rooms_needed} room(s) for {duration-1} nights in {destination}",
            },
            {
                "category": BudgetCategory.FOOD.value,
                "estimated_amount": round(food_total, 2),
                "actual_amount": 0.0,
                "notes": f"3 meals/day for {travelers} travelers",
            },
            {
                "category": BudgetCategory.ACTIVITIES.value,
                "estimated_amount": round(activities_total, 2),
                "actual_amount": 0.0,
                "notes": f"Tickets, boating, entry permits for {duration} days",
            },
            {
                "category": BudgetCategory.MISCELLANEOUS.value,
                "estimated_amount": round(misc_total, 2),
                "actual_amount": 0.0,
                "notes": "Emergency buffer and snacks",
            },
        ]
