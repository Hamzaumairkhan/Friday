"""Trip Group and Community Chat API endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any

from app.database.database import get_db
from app.models.user import User
from app.models.organizer import Organizer
from app.schemas.trip_group import (
    TripGroupResponse,
    TripGroupMessageCreate,
    TripGroupMessageResponse,
    TripGroupSummaryResponse,
)
from app.services.trip_group_service import TripGroupService
from app.core.security import get_current_user, get_current_organizer

router = APIRouter(prefix="/groups", tags=["Trip Groups & Community Chat"])


@router.get("/organizer/my-groups", response_model=List[TripGroupSummaryResponse])
async def list_organizer_trip_groups(
    current_organizer: Organizer = Depends(get_current_organizer),
    db: AsyncSession = Depends(get_db),
):
    """List all trip groups owned and operated by the authenticated organizer."""
    service = TripGroupService(db)
    return await service.list_organizer_groups(current_organizer)


@router.get("/traveler/my-groups", response_model=List[TripGroupSummaryResponse])
async def list_traveler_trip_groups(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all trip groups for which the traveler has confirmed bookings."""
    service = TripGroupService(db)
    return await service.list_traveler_groups(current_user)


@router.get("/trips/{package_id}", response_model=TripGroupResponse)
async def get_trip_group(
    package_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve details and member list for an organizer trip group. IDOR protected."""
    service = TripGroupService(db)
    return await service.get_group_details(package_id=package_id, current_user=current_user)


@router.get("/trips/{package_id}/messages", response_model=List[TripGroupMessageResponse])
async def list_trip_group_messages(
    package_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve chronological messages for a trip group. IDOR protected."""
    service = TripGroupService(db)
    return await service.list_messages(package_id=package_id, current_user=current_user)


@router.post("/trips/{package_id}/messages", response_model=TripGroupMessageResponse, status_code=status.HTTP_201_CREATED)
async def post_trip_group_message(
    package_id: str,
    req: TripGroupMessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Post a message or announcement into the trip group. IDOR protected."""
    service = TripGroupService(db)
    return await service.post_message(
        package_id=package_id,
        message_text=req.message,
        current_user=current_user,
    )
