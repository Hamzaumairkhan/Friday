"""Package repository — data access layer."""

from typing import Optional, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.package import Package


from sqlalchemy.orm import selectinload


class PackageRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_all(
        self,
        destination: Optional[str] = None,
        organizer_id: Optional[str] = None,
        max_price: Optional[float] = None,
        max_duration: Optional[int] = None,
        include_inactive: bool = False,
    ) -> List[Package]:
        query = select(Package).options(selectinload(Package.organizer))
        if not include_inactive:
            query = query.where(Package.is_active == True)
        if destination:
            query = query.where(Package.destination.ilike(f"%{destination}%"))
        if organizer_id:
            query = query.where(Package.organizer_id == organizer_id)
        if max_price:
            query = query.where(Package.price_per_person <= max_price)
        if max_duration:
            query = query.where(Package.duration_days <= max_duration)
        query = query.order_by(Package.rating.desc(), Package.reviews_count.desc(), Package.created_at.desc())
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_by_id(self, package_id: str) -> Optional[Package]:
        result = await self.db.execute(
            select(Package).options(selectinload(Package.organizer)).where(Package.id == package_id)
        )
        return result.scalar_one_or_none()

    async def create(self, package: Package) -> Package:
        self.db.add(package)
        await self.db.flush()
        return package

    async def update(self, package: Package) -> Package:
        await self.db.flush()
        return package

    async def delete(self, package: Package) -> None:
        await self.db.delete(package)
        await self.db.flush()
