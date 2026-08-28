"""Notification schemas."""

from typing import Optional
from pydantic import BaseModel


class NotificationResponse(BaseModel):
    id: str
    user_id: str
    type: str
    title: str
    message: Optional[str] = None
    related_booking_id: Optional[str] = None
    related_trip_id: Optional[str] = None
    is_read: bool
    created_at: str

    model_config = {"from_attributes": True}
