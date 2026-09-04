"""Booking schemas."""

from typing import Optional
from pydantic import BaseModel, model_validator


class BookingCreate(BaseModel):
    trip_id: Optional[str] = None
    package_id: str
    travelers: Optional[int] = None
    seats_booked: Optional[int] = None
    notes: Optional[str] = None
    traveler_name: Optional[str] = None
    traveler_email: Optional[str] = None
    traveler_phone: Optional[str] = None

    @model_validator(mode="after")
    def validate_travelers_or_seats(self):
        if not self.travelers and not self.seats_booked:
            self.travelers = 1
            self.seats_booked = 1
        elif not self.travelers and self.seats_booked:
            self.travelers = self.seats_booked
        elif self.travelers and not self.seats_booked:
            self.seats_booked = self.travelers
        return self


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
