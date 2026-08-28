"""Itinerary API endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database.database import get_db
from app.models.itinerary import Itinerary, Day, Activity
from app.schemas.itinerary import ItineraryResponse, DaySchema, ActivitySchema
from app.services.trip_service import TripService
from app.core.security import get_current_user_id

router = APIRouter(prefix="/trips", tags=["Itinerary"])


@router.get("/{trip_id}/itinerary", response_model=ItineraryResponse)
async def get_trip_itinerary(
    trip_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    trip_service = TripService(db)
    await trip_service.get_trip(trip_id=trip_id, user_id=user_id)

    result = await db.execute(
        select(Itinerary)
        .options(
            selectinload(Itinerary.days).selectinload(Day.activities)
        )
        .where(Itinerary.trip_id == trip_id)
    )
    itin = result.scalar_one_or_none()
    if not itin:
        raise HTTPException(status_code=404, detail="Itinerary not found for this trip")

    days_schema = []
    for d in itin.days:
        act_schemas = [
            ActivitySchema(
                id=a.id,
                order=a.order,
                title=a.title,
                description=a.description,
                location=a.location,
                latitude=a.latitude,
                longitude=a.longitude,
                start_time=a.start_time,
                end_time=a.end_time,
                duration_minutes=a.duration_minutes,
                estimated_cost=a.estimated_cost or 0,
                category=a.category.value if hasattr(a.category, 'value') else a.category,
                travel_time_minutes=a.travel_time_minutes,
                confidence=a.confidence or 0.8,
                image_url=a.image_url,
                notes=a.notes,
            )
            for a in d.activities
        ]
        days_schema.append(
            DaySchema(
                id=d.id,
                day_number=d.day_number,
                date=d.date,
                title=d.title,
                summary=d.summary,
                activities=act_schemas,
            )
        )

    return ItineraryResponse(
        id=itin.id,
        trip_id=itin.trip_id,
        version=itin.version,
        notes=itin.notes,
        days=days_schema,
    )
