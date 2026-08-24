"""Trips API endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.database.database import get_db
from app.schemas.trip import (
    TripCreate,
    TripUpdate,
    TripResponse,
    TripMemberAdd,
    ReplanRequest,
    ReplanResponse,
)
from app.schemas.organizer import OrganizerMatchRequest, OrganizerMatchResult
from app.services.trip_service import TripService
from app.services.marketplace_service import MarketplaceService
from app.agents.replanner_agent import ReplannerAgent
from app.core.security import get_current_user_id
from app.core.logging import get_logger

logger = get_logger("api.trips")
router = APIRouter(prefix="/trips", tags=["Trips"])


def _format_trip_response(t) -> TripResponse:
    return TripResponse(
        id=t.id,
        owner_id=t.owner_id,
        title=t.title,
        destination=t.destination,
        origin=t.origin or "Islamabad",
        duration=t.duration,
        travelers=t.travelers or 1,
        budget_total=t.budget_total,
        budget_per_person=t.budget_per_person,
        start_date=t.start_date,
        end_date=t.end_date,
        status=t.status.value if hasattr(t.status, 'value') else t.status,
        preferences=t.preferences or [],
        constraints=t.constraints or [],
        version=t.version or 1,
        created_at=t.created_at.isoformat() if t.created_at else "",
        updated_at=t.updated_at.isoformat() if t.updated_at else "",
    )


@router.post("", response_model=TripResponse, status_code=status.HTTP_201_CREATED)
async def create_trip(
    req: TripCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    service = TripService(db)
    trip = await service.create_trip(user_id=user_id, data=req)
    return _format_trip_response(trip)


@router.get("", response_model=List[TripResponse])
async def list_trips(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    service = TripService(db)
    trips = await service.list_user_trips(user_id=user_id)
    return [_format_trip_response(t) for t in trips]


@router.get("/{trip_id}", response_model=TripResponse)
async def get_trip(
    trip_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    service = TripService(db)
    trip = await service.get_trip(trip_id=trip_id, user_id=user_id)
    return _format_trip_response(trip)


@router.patch("/{trip_id}", response_model=TripResponse)
async def update_trip(
    trip_id: str,
    req: TripUpdate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    service = TripService(db)
    trip = await service.update_trip(trip_id=trip_id, user_id=user_id, data=req)
    return _format_trip_response(trip)


@router.post("/{trip_id}/replan", response_model=ReplanResponse)
async def replan_trip(
    trip_id: str,
    req: ReplanRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Dynamic replanning endpoint: adjusts budget, accommodations, transport without full regen."""
    service = TripService(db)
    trip = await service.get_trip(trip_id=trip_id, user_id=user_id)
    trip_state = await service.to_trip_state(trip)
    trip_state_dict = trip_state.model_dump()

    # Determine new target budget per person
    new_budget_pp = None
    if req.changes and "budget_per_person" in req.changes:
        new_budget_pp = float(req.changes["budget_per_person"])
    elif req.changes and "budget_total" in req.changes:
        new_budget_pp = float(req.changes["budget_total"]) / max(1, trip.travelers)
    else:
        # Extract from natural language message
        import re
        b_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:k|thousand|hazar)?\b", req.message.lower())
        if b_match:
            val = float(b_match.group(1))
            if "k" in req.message.lower() or val < 500:
                val *= 1000
            new_budget_pp = val
        else:
            new_budget_pp = (trip.budget_per_person or 40000) * 0.75

    updated_state, changes, totals = ReplannerAgent.replan_budget(
        current_trip_state=trip_state_dict,
        new_budget_per_person=new_budget_pp,
        reason=req.message,
    )

    # Persist updated values to database
    trip.budget_per_person = updated_state["budget_per_person"]
    trip.budget_total = updated_state["budget_total"]
    trip.version = updated_state["version"]
    await service.repo.update(trip)
    await db.commit()

    return ReplanResponse(
        old_version=totals["old_version"],
        new_version=totals["new_version"],
        changes=changes,
        old_total=totals["old_total"],
        new_total=totals["new_total"],
        message=f"Trip successfully replanned for Rs. {new_budget_pp:,.0f} per person.",
    )


@router.post("/{trip_id}/members", status_code=status.HTTP_201_CREATED)
async def add_trip_member(
    trip_id: str,
    req: TripMemberAdd,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    service = TripService(db)
    member = await service.add_member(
        trip_id=trip_id,
        current_user_id=user_id,
        new_user_id=req.user_id,
        role=req.role,
    )
    return {
        "id": member.id,
        "trip_id": member.trip_id,
        "user_id": member.user_id,
        "role": member.role.value if hasattr(member.role, 'value') else member.role,
        "invitation_status": member.invitation_status,
    }


@router.post("/{trip_id}/organizer-match", response_model=List[OrganizerMatchResult])
async def match_organizers_for_trip(
    trip_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    trip_service = TripService(db)
    marketplace_service = MarketplaceService(db)

    trip = await trip_service.get_trip(trip_id=trip_id, user_id=user_id)
    match_req = OrganizerMatchRequest(
        destination=trip.destination,
        budget_per_person=trip.budget_per_person,
        travelers=trip.travelers,
        duration=trip.duration,
        preferences=trip.preferences or [],
    )
    return await marketplace_service.match_organizers(match_req)
