"""Package schemas."""

from typing import Optional, List
from pydantic import BaseModel, Field


class PackageCreate(BaseModel):
    title: str = Field(..., min_length=3)
    destination: str = Field(..., min_length=2)
    duration_days: int = Field(..., ge=1, le=30)
    price_per_person: float = Field(..., gt=0)
    max_travelers: int = Field(default=15, ge=1)
    description: Optional[str] = None
    inclusions: Optional[List[str]] = None
    exclusions: Optional[List[str]] = None
    accommodation_type: Optional[str] = None
    transportation_type: Optional[str] = None
    activities: Optional[List[str]] = None


class PackageResponse(BaseModel):
    id: str
    organizer_id: str
    title: str
    destination: str
    duration_days: int
    price_per_person: float
    max_travelers: int
    description: Optional[str] = None
    inclusions: List[str] = Field(default_factory=list)
    exclusions: List[str] = Field(default_factory=list)
    accommodation_type: Optional[str] = None
    transportation_type: Optional[str] = None
    activities: List[str] = Field(default_factory=list)
    is_active: bool = True

    model_config = {"from_attributes": True}
