"""Booking schemas."""

from typing import Optional
from pydantic import BaseModel


class BookingCreate(BaseModel):
    trip_id: Optional[str] = None
    package_id: str
    travelers: int
    notes: Optional[str] = None
    traveler_name: Optional[str] = None
    traveler_email: Optional[str] = None
    traveler_phone: Optional[str] = None


class BookingResponse(BaseModel):
    id: str
    trip_id: Optional[str] = None
    package_id: Optional[str] = None
    user_id: Optional[str] = None
    organizer_id: Optional[str] = None
    travelers: int
    total_price: float
    status: str
    notes: Optional[str] = None
    package_title: Optional[str] = None
    destination: Optional[str] = None
    duration_days: Optional[int] = None
    price_per_person: Optional[float] = None
    organizer_name: Optional[str] = None
    traveler_name: Optional[str] = None
    traveler_email: Optional[str] = None
    traveler_phone: Optional[str] = None
    payment_status: Optional[str] = None
    payment_proof_url: Optional[str] = None
    traveler_profile_picture: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    model_config = {"from_attributes": True}
