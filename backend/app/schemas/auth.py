"""Authentication and registration schemas strictly separating Traveler and Organizer frontend roles."""

from typing import Optional, List
import enum
from pydantic import BaseModel, Field
from app.schemas.user import UserResponse
from app.schemas.organizer import OrganizerResponse


class PublicRegistrationRole(str, enum.Enum):
    TRAVELER = "TRAVELER"
    ORGANIZER = "ORGANIZER"


class RegisterRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=150)
    name: str = Field(..., min_length=2, max_length=100)
    role: PublicRegistrationRole = PublicRegistrationRole.TRAVELER
    profile_picture: Optional[str] = None
    # Organizer application fields (used when role == ORGANIZER)
    organizer_name: Optional[str] = None
    contact_phone: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    destinations: Optional[List[str]] = None
    website: Optional[str] = None


class LoginRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=150)
    intended_role: PublicRegistrationRole = PublicRegistrationRole.TRAVELER
    # Optional Firebase ID token passed from frontend Google/Firebase auth
    firebase_id_token: Optional[str] = None


class AuthResponse(BaseModel):
    user: UserResponse
    organizer_profile: Optional[OrganizerResponse] = None
    token: str
    message: str
