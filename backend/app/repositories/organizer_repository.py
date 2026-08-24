"""Organizer repository — data access layer."""

from typing import Optional, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.organizer import Organizer
from app.models.package import Package


class OrganizerRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_all(
        self,
        destination: Optional[str] = None,
        is_verified: Optional[bool] = None,
    ) -> List[Organizer]:
        query = select(Organizer)
        if is_verified is not None:
            query = query.where(Organizer.is_verified == is_verified)
        query = query.order_by(Organizer.rating.desc())
        result = await self.db.execute(query)
        organizers = list(result.scalars().all())

        if destination:
            organizers = [
                o for o in organizers
                if destination.lower() in [d.lower() for d in (o.destinations or [])]
            ]
        return organizers

    async def get_by_id(self, organizer_id: str) -> Optional[Organizer]:
        result = await self.db.execute(select(Organizer).where(Organizer.id == organizer_id))
        return result.scalar_one_or_none()

    async def get_by_user_id(self, user_id: str) -> Optional[Organizer]:
        result = await self.db.execute(select(Organizer).where(Organizer.user_id == user_id))
        return result.scalar_one_or_none()

    async def create(self, organizer: Organizer) -> Organizer:
        self.db.add(organizer)
        await self.db.flush()
        return organizer

    async def update(self, organizer: Organizer) -> Organizer:
        await self.db.flush()
        return organizer
