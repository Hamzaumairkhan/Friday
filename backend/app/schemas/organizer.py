"""Organizer schemas."""

from typing import Optional
from pydantic import BaseModel, Field


class OrganizerResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    verification_status: str
    is_verified: bool
    destinations: list[str] = Field(default_factory=list)
    rating: float
    reviews_count: int
    location: Optional[str] = None
    website: Optional[str] = None

    # Business & Capacity
    cnic: Optional[str] = None
    number_of_buses: Optional[int] = None
    vehicle_capacity: Optional[int] = None
    maximum_group_size: Optional[int] = None
    experience_years: Optional[int] = None
    experience_description: Optional[str] = None
    onboarding_completed: bool = False

    # Payment Information
    payment_wallet_type: Optional[str] = None
    payment_account_title: Optional[str] = None
    payment_account_number: Optional[str] = None
    payment_bank_name: Optional[str] = None
    payment_instructions: Optional[str] = None

    model_config = {"from_attributes": True}


class OrganizerMatchRequest(BaseModel):
    destination: Optional[str] = None
    budget_per_person: Optional[float] = None
    travelers: Optional[int] = None
    duration: Optional[int] = None
    preferences: list[str] = Field(default_factory=list)


class OrganizerMatchResult(BaseModel):
    organizer: OrganizerResponse
    match_score: float
    reasons: list[str]
    matching_packages: list[dict] = Field(default_factory=list)
