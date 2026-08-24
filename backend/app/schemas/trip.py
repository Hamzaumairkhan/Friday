"""Trip schemas."""

from typing import Optional
from pydantic import BaseModel, Field


class TripCreate(BaseModel):
    destination: Optional[str] = None
    origin: str = "Islamabad"
    duration: Optional[int] = None
    travelers: int = 1
    budget_total: Optional[float] = None
    budget_per_person: Optional[float] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    preferences: list[str] = Field(default_factory=list)
    constraints: list[str] = Field(default_factory=list)
    title: Optional[str] = None


class TripUpdate(BaseModel):
    destination: Optional[str] = None
    origin: Optional[str] = None
    duration: Optional[int] = None
    travelers: Optional[int] = None
    budget_total: Optional[float] = None
    budget_per_person: Optional[float] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    preferences: Optional[list[str]] = None
    constraints: Optional[list[str]] = None
    title: Optional[str] = None
    status: Optional[str] = None


class TripResponse(BaseModel):
    id: str
    owner_id: str
    title: Optional[str] = None
    destination: Optional[str] = None
    origin: str
    duration: Optional[int] = None
    travelers: int
    budget_total: Optional[float] = None
    budget_per_person: Optional[float] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    status: str
    preferences: list[str]
    constraints: list[str]
    version: int
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}


class TripMemberAdd(BaseModel):
    user_id: str
    role: str = "MEMBER"


class ReplanRequest(BaseModel):
    """Request body for replanning — describes what changed."""
    message: str  # natural language change request
    changes: Optional[dict] = None  # structured changes (budget, dates, etc.)


class ReplanResponse(BaseModel):
    old_version: int
    new_version: int
    changes: list[dict]
    old_total: Optional[float] = None
    new_total: Optional[float] = None
    message: str


class TripState(BaseModel):
    """The full trip state used by AI agents."""
    trip_id: str
    destination: Optional[str] = None
    origin: str = "Islamabad"
    duration: Optional[int] = None
    travelers: int = 1
    budget_total: Optional[float] = None
    budget_per_person: Optional[float] = None
    preferences: list[str] = Field(default_factory=list)
    constraints: list[str] = Field(default_factory=list)
    itinerary: Optional[dict] = None
    budget_breakdown: Optional[dict] = None
    research: list[dict] = Field(default_factory=list)
    weather: Optional[dict] = None
    conversation_context: list[dict] = Field(default_factory=list)
    version: int = 1
