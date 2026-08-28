"""Trip Group and Message schemas."""

from typing import Optional, List
from pydantic import BaseModel, Field


class TripGroupMemberResponse(BaseModel):
    id: str
    user_id: str
    name: str
    profile_picture: Optional[str] = None
    role: str
    joined_at: str

    model_config = {"from_attributes": True}


class TripGroupMessageCreate(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)


class TripGroupMessageResponse(BaseModel):
    id: str
    group_id: str
    sender_id: str
    sender_name: str
    sender_role: str
    message: str
    created_at: str

    model_config = {"from_attributes": True}


class TripGroupResponse(BaseModel):
    id: str
    package_id: str
    organizer_id: str
    title: str
    destination: Optional[str] = None
    duration_days: Optional[int] = None
    price_per_person: Optional[float] = None
    max_travelers: Optional[int] = None
    confirmed_travelers_count: int = 0
    organizer_name: Optional[str] = None
    members: List[TripGroupMemberResponse] = Field(default_factory=list)
    created_at: str

    model_config = {"from_attributes": True}


class TripGroupSummaryResponse(BaseModel):
    id: str
    package_id: str
    title: str
    destination: Optional[str] = None
    organizer_name: Optional[str] = None
    confirmed_travelers_count: int = 0
    max_travelers: int = 20
    is_full: bool = False
    last_message: Optional[str] = None
    last_message_at: Optional[str] = None
