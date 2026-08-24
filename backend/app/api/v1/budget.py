"""Budget API endpoints."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database.database import get_db
from app.models.budget import Budget
from app.schemas.budget import BudgetSummary
from app.services.trip_service import TripService
from app.services.budget_service import BudgetService
from app.core.security import get_current_user_id

router = APIRouter(prefix="/trips", tags=["Budget"])


@router.get("/{trip_id}/budget", response_model=BudgetSummary)
async def get_trip_budget(
    trip_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    trip_service = TripService(db)
    trip = await trip_service.get_trip(trip_id=trip_id, user_id=user_id)

    result = await db.execute(select(Budget).where(Budget.trip_id == trip_id))
    budgets = result.scalars().all()

    items = [
        {
            "category": b.category.value if hasattr(b.category, 'value') else b.category,
            "estimated_amount": b.estimated_amount,
            "actual_amount": b.actual_amount,
            "notes": b.notes,
        }
        for b in budgets
    ]

    return BudgetService.calculate_summary(
        trip_id=trip_id,
        total_budget_limit=trip.budget_total,
        budget_items=items,
        travelers=trip.travelers,
    )
