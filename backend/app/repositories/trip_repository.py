"""Trip repository — data access layer."""

from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.trip import Trip, TripMember
from app.models.itinerary import Itinerary, Day, Activity
from app.models.budget import Budget
from app.models.conversation import Conversation


class TripRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, trip: Trip) -> Trip:
        self.db.add(trip)
        await self.db.flush()
        return trip

    async def get_by_id(self, trip_id: str) -> Optional[Trip]:
        result = await self.db.execute(
            select(Trip)
            .options(
                selectinload(Trip.members),
                selectinload(Trip.itinerary).selectinload(Itinerary.days).selectinload(Day.activities),
                selectinload(Trip.budgets),
            )
            .where(Trip.id == trip_id)
        )
        return result.scalar_one_or_none()

    async def get_by_owner(self, owner_id: str) -> list[Trip]:
        result = await self.db.execute(
            select(Trip).where(Trip.owner_id == owner_id).order_by(Trip.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_user_trips(self, user_id: str) -> list[Trip]:
        """Get all trips a user owns or is a member of (excluding package tour bookings)."""
        from app.models.trip import TripStatus
        # Owned trips
        owned = await self.db.execute(
            select(Trip).where(Trip.owner_id == user_id, Trip.status != TripStatus.BOOKED).order_by(Trip.created_at.desc())
        )
        owned_trips = list(owned.scalars().all())

        # Member trips
        member_result = await self.db.execute(
            select(TripMember.trip_id).where(TripMember.user_id == user_id)
        )
        member_trip_ids = [r[0] for r in member_result.all()]

        if member_trip_ids:
            member_trips_result = await self.db.execute(
                select(Trip).where(Trip.id.in_(member_trip_ids), Trip.status != TripStatus.BOOKED)
            )
            member_trips = list(member_trips_result.scalars().all())
        else:
            member_trips = []

        # Combine and deduplicate
        seen = set()
        all_trips = []
        for t in owned_trips + member_trips:
            if t.id not in seen:
                seen.add(t.id)
                all_trips.append(t)
        return all_trips

    async def update(self, trip: Trip) -> Trip:
        await self.db.flush()
        return trip

    async def add_member(self, member: TripMember) -> TripMember:
        self.db.add(member)
        await self.db.flush()
        return member

    async def is_trip_owner(self, trip_id: str, user_id: str) -> bool:
        result = await self.db.execute(
            select(Trip.id).where(Trip.id == trip_id, Trip.owner_id == user_id)
        )
        return result.scalar_one_or_none() is not None

    async def is_trip_member(self, trip_id: str, user_id: str) -> bool:
        is_owner = await self.is_trip_owner(trip_id, user_id)
        if is_owner:
            return True
        result = await self.db.execute(
            select(TripMember.id).where(
                TripMember.trip_id == trip_id, TripMember.user_id == user_id
            )
        )
        return result.scalar_one_or_none() is not None

    async def save_itinerary(self, itinerary: Itinerary) -> Itinerary:
        self.db.add(itinerary)
        await self.db.flush()
        return itinerary

    async def save_budget(self, budget: Budget) -> Budget:
        self.db.add(budget)
        await self.db.flush()
        return budget

    async def delete_budgets(self, trip_id: str) -> None:
        result = await self.db.execute(select(Budget).where(Budget.trip_id == trip_id))
        for b in result.scalars().all():
            await self.db.delete(b)
        await self.db.flush()

    async def delete(self, trip: Trip) -> None:
        await self.db.delete(trip)
        await self.db.flush()

