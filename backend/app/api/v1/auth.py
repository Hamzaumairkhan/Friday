"""Authentication, registration, and user/organizer profile endpoints."""

import uuid
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database.database import get_db
from app.models.user import User, UserRole
from app.models.organizer import Organizer
from app.schemas.user import UserResponse
from app.schemas.organizer import OrganizerResponse
from app.schemas.auth import RegisterRequest, LoginRequest, AuthResponse, PublicRegistrationRole
from app.repositories.user_repository import UserRepository
from app.repositories.organizer_repository import OrganizerRepository
from app.core.security import get_current_user
from app.core.logging import get_logger

logger = get_logger("api.auth")
router = APIRouter(prefix="/auth", tags=["Authentication & Profile"])


def _format_user(u: User, role_override: str = None) -> UserResponse:
    actual_role = role_override or (u.role.value if hasattr(u.role, 'value') else str(u.role))
    return UserResponse(
        id=u.id,
        email=u.email,
        name=u.name,
        profile_picture=u.profile_picture,
        role=actual_role,
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
        contact_phone=getattr(o, "contact_phone", None) or getattr(o, "phone", None),
        contact_email=getattr(o, "contact_email", None),
        phone=getattr(o, "contact_phone", None) or getattr(o, "phone", None),
        number_of_buses=o.number_of_buses,
        vehicle_capacity=o.vehicle_capacity,
        maximum_group_size=o.maximum_group_size,
        experience_years=o.experience_years,
        experience_description=o.experience_description,
        onboarding_completed=o.onboarding_completed or False,
        payment_account_title=o.payment_account_title,
        payment_account_number=o.payment_account_number,
        payment_bank_name=o.payment_bank_name,
        payment_instructions=o.payment_instructions,
    )


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(
    req: RegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    """Register or sync a TRAVELER or ORGANIZER account."""
    user_repo = UserRepository(db)
    org_repo = OrganizerRepository(db)

    target_role_str = req.role.value if hasattr(req.role, 'value') else str(req.role)
    target_role = UserRole.ORGANIZER if target_role_str == "ORGANIZER" else UserRole.TRAVELER

    user = await user_repo.get_by_email(req.email)
    if not user:
        user_id = str(uuid.uuid4())
        user = User(
            id=user_id,
            email=req.email,
            username=req.email.split("@")[0],
            name=req.name,
            profile_picture=req.profile_picture,
            role=target_role,
            is_active=True,
        )
        user = await user_repo.create(user)
    else:
        user.name = req.name or user.name
        user.profile_picture = req.profile_picture or user.profile_picture
        if target_role == UserRole.ORGANIZER:
            user.role = UserRole.ORGANIZER

    organizer_profile = None
    if target_role == UserRole.ORGANIZER:
        organizer = await org_repo.get_by_user_id(user.id)
        if not organizer:
            org_id = f"org-{uuid.uuid4().hex[:12]}"
            org_name = req.organizer_name or f"{req.name}'s Expeditions"

            has_onboarding = bool(
                req.contact_phone and req.description and req.location
                and req.payment_account_title and req.payment_account_number
            )

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
                number_of_buses=req.number_of_buses,
                vehicle_capacity=req.vehicle_capacity,
                maximum_group_size=req.maximum_group_size,
                experience_years=req.experience_years,
                experience_description=req.experience_description,
                payment_account_title=req.payment_account_title,
                payment_account_number=req.payment_account_number,
                payment_bank_name=req.payment_bank_name,
                payment_instructions=req.payment_instructions,
                onboarding_completed=has_onboarding,
            )
            organizer = await org_repo.create(organizer)
        organizer_profile = _format_organizer(organizer)

    await db.commit()
    logger.info(f"User synced: {user.email} (Role: {user.role})")

    return AuthResponse(
        user=_format_user(user, target_role_str),
        organizer_profile=organizer_profile,
        token=user.id,
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

    target_role_str = req.intended_role.value if hasattr(req.intended_role, 'value') else str(req.intended_role)

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

    user_role_str = user.role.value if hasattr(user.role, 'value') else str(user.role)

    # Privilege check: Cannot log in as Organizer if no organizer profile/role
    if target_role_str == "ORGANIZER" and user_role_str != "ORGANIZER":
        org = await org_repo.get_by_user_id(user.id)
        if not org:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Aapka pehle se Traveler account bana hua hai. Pehle 'Traveler' select kar ke login karein, phir aap settings se Organizer par switch kar sakte hain.",
            )

    organizer_profile = None
    if target_role_str == "ORGANIZER":
        org = await org_repo.get_by_user_id(user.id)
        if not org and user.email:
            all_orgs = await org_repo.list_all()
            for o in all_orgs:
                if o.contact_email == user.email:
                    org = o
                    break
        if org:
            organizer_profile = _format_organizer(org)

    # Update profile picture or name from Google OAuth if provided
    updated = False
    if req.profile_picture and user.profile_picture != req.profile_picture:
        user.profile_picture = req.profile_picture
        updated = True
    if req.name and (not user.name or user.name == "Traveler" or user.name == req.email.split("@")[0]):
        user.name = req.name
        updated = True
    if updated:
        await db.commit()
        await db.refresh(user)

    # Return role matching the intended login role
    return AuthResponse(
        user=_format_user(user, target_role_str),
        organizer_profile=organizer_profile,
        token=user.id,
        message=f"Logged in successfully as {target_role_str}.",
    )


@router.post("/upgrade-to-organizer", response_model=AuthResponse)
async def upgrade_to_organizer(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Allow an existing traveler to switch and activate an organizer profile."""
    user_repo = UserRepository(db)
    org_repo = OrganizerRepository(db)

    current_user.role = UserRole.ORGANIZER
    await user_repo.update(current_user)

    org = await org_repo.get_by_user_id(current_user.id)
    if not org:
        org_id = f"org-{uuid.uuid4().hex[:12]}"
        org = Organizer(
            id=org_id,
            user_id=current_user.id,
            name=f"{current_user.name or 'Verified'}'s Expeditions",
            business_name=f"{current_user.name or 'Verified'}'s Expeditions",
            phone=current_user.phone or "+92 300 1234567",
            description="Curated expeditions and mountain guide services across Northern Pakistan.",
            contact_email=current_user.email,
            verification_status="VERIFIED",
            is_verified=True,
            rating=4.9,
            reviews_count=12,
            onboarding_completed=True,
        )
        org = await org_repo.create(org)

    await db.commit()
    logger.info(f"User {current_user.email} switched to ORGANIZER")

    # Dispatch confirmation email to user
    try:
        if current_user.email:
            from app.services.email_service import EmailService
            email_svc = EmailService()
            await email_svc.send_role_switch_notification(
                recipient_email=current_user.email,
                user_name=current_user.name or "Partner",
                new_role="ORGANIZER",
            )
    except Exception as e:
        logger.warning(f"Failed to dispatch role switch email to {current_user.email}: {e}")

    return AuthResponse(
        user=_format_user(current_user, "ORGANIZER"),
        organizer_profile=_format_organizer(org),
        token=current_user.id,
        message="Successfully switched to Organizer account.",
    )


@router.post("/switch-to-traveler", response_model=AuthResponse)
async def switch_to_traveler(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Allow an existing organizer to switch active view/role back to traveler."""
    user_repo = UserRepository(db)
    current_user.role = UserRole.TRAVELER
    await user_repo.update(current_user)

    org_repo = OrganizerRepository(db)
    org = await org_repo.get_by_user_id(current_user.id)

    await db.commit()
    logger.info(f"User {current_user.email} switched to TRAVELER")

    # Dispatch confirmation email to user
    try:
        if current_user.email:
            from app.services.email_service import EmailService
            email_svc = EmailService()
            await email_svc.send_role_switch_notification(
                recipient_email=current_user.email,
                user_name=current_user.name or "Traveler",
                new_role="TRAVELER",
            )
    except Exception as e:
        logger.warning(f"Failed to dispatch role switch email to {current_user.email}: {e}")

    return AuthResponse(
        user=_format_user(current_user, "TRAVELER"),
        organizer_profile=_format_organizer(org) if org else None,
        token=current_user.id,
        message="Successfully switched to Traveler account.",
    )


class SwitchRoleRequest(BaseModel):
    target_role: str = "TRAVELER"


@router.post("/switch-role", response_model=AuthResponse)
async def switch_user_role(
    req: SwitchRoleRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Unified runtime role switcher between TRAVELER and ORGANIZER."""
    if req.target_role.upper() == "ORGANIZER":
        return await upgrade_to_organizer(current_user=current_user, db=db)
    else:
        return await switch_to_traveler(current_user=current_user, db=db)


@router.get("/me")
async def get_current_user_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return the profile and organizer status of the current authenticated user."""
    user_data = _format_user(current_user).model_dump()
    user_role = current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role)

    if user_role == UserRole.ORGANIZER.value or user_role == "ORGANIZER":
        org_repo = OrganizerRepository(db)
        org = await org_repo.get_by_user_id(current_user.id)
        if not org and current_user.email:
            all_orgs = await org_repo.list_all()
            for o in all_orgs:
                if o.contact_email == current_user.email:
                    org = o
                    break
        if org:
            user_data["organizer_profile"] = _format_organizer(org).model_dump()

    return user_data


