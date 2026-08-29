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
    # Extended onboarding fields
    number_of_buses: Optional[int] = None
    vehicle_capacity: Optional[int] = None
    maximum_group_size: Optional[int] = None
    experience_years: Optional[int] = None
    experience_description: Optional[str] = None
    payment_account_title: Optional[str] = None
    payment_account_number: Optional[str] = None
    payment_bank_name: Optional[str] = None
    payment_instructions: Optional[str] = None


class LoginRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=150)
    intended_role: PublicRegistrationRole = PublicRegistrationRole.TRAVELER
    name: Optional[str] = None
    profile_picture: Optional[str] = None
    # Optional Firebase ID token passed from frontend Google/Firebase auth
    firebase_id_token: Optional[str] = None


class AuthResponse(BaseModel):
    user: UserResponse
    organizer_profile: Optional[OrganizerResponse] = None
    token: str
    message: str
