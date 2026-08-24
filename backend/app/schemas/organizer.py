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
