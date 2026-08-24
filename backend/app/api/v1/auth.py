"""Authentication, registration, and user/organizer profile endpoints."""

import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database.database import get_db
from app.models.user import User, UserRole
from app.models.organizer import Organizer
from app.schemas.user import UserResponse
from app.schemas.organizer import OrganizerResponse
from app.schemas.auth import RegisterRequest, LoginRequest, AuthResponse
from app.repositories.user_repository import UserRepository
from app.repositories.organizer_repository import OrganizerRepository
from app.core.security import get_current_user
from app.core.logging import get_logger

logger = get_logger("api.auth")
router = APIRouter(prefix="/auth", tags=["Authentication & Profile"])


def _format_user(u: User) -> UserResponse:
    return UserResponse(
        id=u.id,
        email=u.email,
        name=u.name,
        profile_picture=u.profile_picture,
        role=u.role.value if hasattr(u.role, 'value') else u.role,
        is_active=u.is_active,
    )


def _format_organizer(o: Organizer) -> OrganizerResponse:
    return OrganizerResponse(
        id=o.id,
        name=o.name,
        description=o.description,
        verification_status=o.verification_status,
        is_verified=o.is_verified,
        destinations=o.destinations or [],
        rating=o.rating or 0.0,
        reviews_count=o.reviews_count or 0,
        location=o.location,
        website=o.website,
    )


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(
    req: RegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    """Register a new TRAVELER or apply as an ORGANIZER."""
    user_repo = UserRepository(db)
    org_repo = OrganizerRepository(db)

    # Check if user already exists
    existing = await user_repo.get_by_email(req.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"An account with email '{req.email}' already exists.",
        )

    # 1. Create User
    user_id = str(uuid.uuid4())
    user = User(
        id=user_id,
        email=req.email,
        name=req.name,
        profile_picture=req.profile_picture,
        role=req.role,
        is_active=True,
    )
    user = await user_repo.create(user)

    organizer_profile = None
    # 2. If ORGANIZER role, create Organizer profile linked to user_id
    if req.role == UserRole.ORGANIZER:
        org_id = f"org-{uuid.uuid4().hex[:12]}"
        org_name = req.organizer_name or f"{req.name}'s Expeditions"
        organizer = Organizer(
            id=org_id,
            user_id=user.id,
            name=org_name,
            description=req.description,
            contact_email=req.email,
            contact_phone=req.contact_phone,
            destinations=req.destinations or [],
            location=req.location,
            website=req.website,
            verification_status="PENDING",
            is_verified=False,
            rating=0.0,
            reviews_count=0,
        )
        organizer = await org_repo.create(organizer)
        organizer_profile = _format_organizer(organizer)

    await db.commit()
    logger.info(f"New {req.role.value} registered: {user.email} (ID: {user.id})")

    return AuthResponse(
        user=_format_user(user),
        organizer_profile=organizer_profile,
        token=user.id,  # Header authentication token
        message="Registration successful.",
    )


@router.post("/login", response_model=AuthResponse)
async def login(
    req: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """Authenticate and verify intended role with server-side privilege check."""
    user_repo = UserRepository(db)
    org_repo = OrganizerRepository(db)

    user = await user_repo.get_by_email(req.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No account found with email '{req.email}'. Please register first.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated.",
        )

    # Strict Role Authorization: Verify actual privileges match intended login role
    user_role = user.role.value if hasattr(user.role, 'value') else user.role
    if req.intended_role == UserRole.ORGANIZER and user_role != UserRole.ORGANIZER.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: This account does not have ORGANIZER privileges. Please log in as a Traveler.",
        )

    organizer_profile = None
    if user_role == UserRole.ORGANIZER.value:
        org = await org_repo.get_by_user_id(user.id)
        if not org and user.email:
            all_orgs = await org_repo.list_all()
            for o in all_orgs:
                if o.contact_email == user.email:
                    org = o
                    break
        if org:
            organizer_profile = _format_organizer(org)

    return AuthResponse(
        user=_format_user(user),
        organizer_profile=organizer_profile,
        token=user.id,
        message=f"Logged in successfully as {user_role}.",
    )


@router.get("/me")
async def get_current_user_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return the profile and organizer status of the current authenticated user."""
    user_data = _format_user(current_user).model_dump()
    user_role = current_user.role.value if hasattr(current_user.role, 'value') else current_user.role

    if user_role == UserRole.ORGANIZER.value:
        org_repo = OrganizerRepository(db)
        org = await org_repo.get_by_user_id(current_user.id)
        if org:
            user_data["organizer_profile"] = _format_organizer(org).model_dump()

    return user_data
