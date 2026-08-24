"""Packages API endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.database.database import get_db
from app.services.marketplace_service import MarketplaceService

router = APIRouter(prefix="/packages", tags=["Packages"])


@router.get("")
async def list_packages(
    organizer_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    service = MarketplaceService(db)
    pkgs = await service.list_packages(organizer_id=organizer_id)
    return [
        {
            "id": p.id,
            "organizer_id": p.organizer_id,
            "title": p.title,
            "destination": p.destination,
            "duration_days": p.duration_days,
            "price_per_person": p.price_per_person,
            "max_travelers": p.max_travelers,
            "description": p.description,
            "inclusions": p.inclusions or [],
            "exclusions": p.exclusions or [],
            "accommodation_type": p.accommodation_type,
            "transportation_type": p.transportation_type,
            "activities": p.activities or [],
        }
        for p in pkgs
    ]


@router.get("/{package_id}")
async def get_package(
    package_id: str,
    db: AsyncSession = Depends(get_db),
):
    service = MarketplaceService(db)
    p = await service.get_package(package_id)
    if not p:
        raise HTTPException(status_code=404, detail="Package not found")
    return {
        "id": p.id,
        "organizer_id": p.organizer_id,
        "title": p.title,
        "destination": p.destination,
        "duration_days": p.duration_days,
        "price_per_person": p.price_per_person,
        "max_travelers": p.max_travelers,
        "description": p.description,
        "inclusions": p.inclusions or [],
        "exclusions": p.exclusions or [],
        "accommodation_type": p.accommodation_type,
        "transportation_type": p.transportation_type,
        "activities": p.activities or [],
    }
