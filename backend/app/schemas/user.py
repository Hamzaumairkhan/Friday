"""User profile schemas."""

from typing import Optional
from pydantic import BaseModel


class UserResponse(BaseModel):
    id: str
    email: str
    name: Optional[str] = None
    profile_picture: Optional[str] = None
    role: str
    is_active: bool

    model_config = {"from_attributes": True}
