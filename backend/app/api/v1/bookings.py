"""Bookings API endpoints with authoritative package and organizer snapshot serialization."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.database.database import get_db
from app.schemas.booking import BookingCreate, BookingResponse
from app.services.booking_service import BookingService
from app.core.security import get_current_user_id

router = APIRouter(prefix="/bookings", tags=["Bookings"])


def _format_booking(b) -> BookingResponse:
    return BookingResponse(
        id=b.id,
        trip_id=b.trip_id,
        package_id=b.package_id,
        user_id=b.user_id,
        organizer_id=b.organizer_id,
        travelers=b.travelers,
        total_price=b.total_price,
        status=b.status.value if hasattr(b.status, 'value') else b.status,
        notes=b.notes,
        package_title=b.package_title,
        destination=b.destination,
        duration_days=b.duration_days,
        price_per_person=b.price_per_person,
        organizer_name=b.organizer_name,
        traveler_name=b.traveler_name,
        created_at=b.created_at.isoformat() if b.created_at else "",
        updated_at=b.updated_at.isoformat() if b.updated_at else "",
    )


@router.post("", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
async def create_booking(
    req: BookingCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    service = BookingService(db)
    booking = await service.create_booking_request(user_id=user_id, data=req)
    return _format_booking(booking)


@router.get("", response_model=List[BookingResponse])
async def list_user_bookings(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    service = BookingService(db)
    bookings = await service.list_user_bookings(user_id=user_id)
    return [_format_booking(b) for b in bookings]


@router.get("/{booking_id}", response_model=BookingResponse)
async def get_booking(
    booking_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    service = BookingService(db)
    booking = await service.get_booking(booking_id=booking_id, user_id=user_id)
    return _format_booking(booking)
