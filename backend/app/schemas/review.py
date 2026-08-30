"""Review schemas."""

from typing import Optional
from pydantic import BaseModel, Field


class ReviewCreate(BaseModel):
    rating: float = Field(..., ge=1.0, le=5.0)
    title: Optional[str] = None
    content: Optional[str] = None


class ReviewResponse(BaseModel):
    id: str
    user_id: str
    organizer_id: str
    package_id: Optional[str] = None
    rating: float
    title: Optional[str] = None
    content: Optional[str] = None
    reviewer_name: Optional[str] = None
    created_at: str

    model_config = {"from_attributes": True}
