"""Trip schemas."""

from typing import Optional, Any
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
    preferences: Optional[Any] = None
    constraints: Optional[Any] = None
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
    preferences: Optional[Any] = None
    constraints: Optional[Any] = None
    title: Optional[str] = None
    status: Optional[str] = None
    is_public: Optional[bool] = None
    show_members_publicly: Optional[bool] = None
    allow_cloning: Optional[bool] = None
    image_url: Optional[str] = None
    advisories: Optional[list] = None


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
    preferences: Optional[Any] = None
    constraints: Optional[Any] = None
    version: int
    is_public: bool = False
    show_members_publicly: bool = False
    allow_cloning: bool = True
    copied_from_trip_id: Optional[str] = None
    image_url: Optional[str] = None
    advisories: list = Field(default_factory=list)
    views_count: int = 0
    likes_count: int = 0
    rating: float = 0.0
    reviews_count: int = 0
    weather: Optional[dict] = None
    owner_role: Optional[str] = "TRAVELER"
    members: list[dict] = Field(default_factory=list)
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}


class GuidedPlanRequest(BaseModel):
    destination_query: Optional[str] = None
    destination: Optional[str] = None
    origin: Optional[str] = "Islamabad"
    travelers: int = Field(default=2, ge=1, le=10)
    duration: Optional[str] = "4-6_days"
    duration_days: Optional[int] = 4
    departure_date: Optional[str] = None
    return_date: Optional[str] = None
    budget: Optional[float] = 10000.0
    budget_type: str = "total_trip"
    budget_flexibility: str = "some_flexibility"
    accommodation_preference: str = "comfortable"
    travel_styles: list[str] = Field(default_factory=list)
    additional_preferences: Optional[str] = None
    slot_preferences: Optional[dict] = None
    slot_selections: Optional[dict] = None
    lead_contact: Optional[dict] = None  # {"name": "...", "email": "...", "phone": "..."}
    companions: Optional[list[dict]] = Field(default_factory=list)  # [{"name": "...", "email": "...", "phone": "..."}, ...]
    show_members_publicly: bool = False
    allow_cloning: bool = True



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
    preferences: Optional[Any] = None
    constraints: Optional[Any] = None
    itinerary: Optional[dict] = None
    budget_breakdown: Optional[dict] = None
    research: list[dict] = Field(default_factory=list)
    weather: Optional[dict] = None
    conversation_context: list[dict] = Field(default_factory=list)
    version: int = 1
