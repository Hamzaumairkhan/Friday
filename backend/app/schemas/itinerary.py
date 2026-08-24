"""Itinerary schemas."""

from typing import Optional
from pydantic import BaseModel, Field


class ActivitySchema(BaseModel):
    id: Optional[str] = None
    order: int = 0
    title: str
    description: Optional[str] = None
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    duration_minutes: Optional[int] = None
    estimated_cost: float = 0
    category: str = "OTHER"
    travel_time_minutes: Optional[int] = None
    confidence: float = 0.8
    notes: Optional[str] = None

    model_config = {"from_attributes": True}


class DaySchema(BaseModel):
    id: Optional[str] = None
    day_number: int
    date: Optional[str] = None
    title: Optional[str] = None
    summary: Optional[str] = None
    activities: list[ActivitySchema] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class ItineraryResponse(BaseModel):
    id: str
    trip_id: str
    version: int
    notes: Optional[str] = None
    days: list[DaySchema] = Field(default_factory=list)

    model_config = {"from_attributes": True}
