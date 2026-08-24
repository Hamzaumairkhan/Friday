"""Booking repository — data access layer."""

from typing import Optional, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.booking import Booking


class BookingRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, booking: Booking) -> Booking:
        self.db.add(booking)
        await self.db.flush()
        return booking

    async def get_by_id(self, booking_id: str) -> Optional[Booking]:
        result = await self.db.execute(select(Booking).where(Booking.id == booking_id))
        return result.scalar_one_or_none()

    async def get_by_user(self, user_id: str) -> List[Booking]:
        result = await self.db.execute(
            select(Booking).where(Booking.user_id == user_id).order_by(Booking.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_by_organizer(self, organizer_id: str) -> List[Booking]:
        result = await self.db.execute(
            select(Booking).where(Booking.organizer_id == organizer_id).order_by(Booking.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_by_trip(self, trip_id: str) -> List[Booking]:
        result = await self.db.execute(
            select(Booking).where(Booking.trip_id == trip_id)
        )
        return list(result.scalars().all())

    async def update(self, booking: Booking) -> Booking:
        await self.db.flush()
        return booking
