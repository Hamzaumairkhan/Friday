"""Group travel and collaboration endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.database.database import get_db
from app.models.trip import TripMember, Trip
from app.models.user import User
from app.schemas.trip import TripMemberAdd
from app.services.trip_service import TripService
from app.core.security import get_current_user_id

router = APIRouter(prefix="/groups", tags=["Group Travel"])


@router.get("/trips/{trip_id}/members")
async def list_trip_members(
    trip_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    trip_service = TripService(db)
    await trip_service.get_trip(trip_id, user_id)

    result = await db.execute(
        select(TripMember, User.username, User.email, User.full_name)
        .join(User, TripMember.user_id == User.id)
        .where(TripMember.trip_id == trip_id)
    )
    members = []
    for m, username, email, full_name in result.all():
        members.append({
            "id": m.id,
            "user_id": m.user_id,
            "username": username,
            "email": email,
            "full_name": full_name,
            "role": m.role.value if hasattr(m.role, 'value') else m.role,
            "invitation_status": m.invitation_status,
        })
    return members
