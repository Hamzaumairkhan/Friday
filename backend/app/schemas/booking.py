"""Booking schemas."""

from typing import Optional
from pydantic import BaseModel


class BookingCreate(BaseModel):
    trip_id: str
    package_id: str
    travelers: int
    notes: Optional[str] = None


class BookingResponse(BaseModel):
    id: str
    trip_id: str
    package_id: str
    user_id: str
    organizer_id: str
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
    payment_status: Optional[str] = None
    payment_proof_url: Optional[str] = None
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}
