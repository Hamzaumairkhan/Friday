"""Organizers API endpoints — Public catalog & Organizer Dashboard."""

import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

from app.database.database import get_db
from app.models.organizer import Organizer
from app.models.package import Package
from app.models.booking import Booking, BookingStatus, PaymentStatus
from app.schemas.organizer import OrganizerResponse
from app.schemas.package import PackageCreate, PackageResponse
from app.schemas.booking import BookingResponse
from app.schemas.payment import PaymentVerifyRequest
from app.services.marketplace_service import MarketplaceService
from app.services.notification_service import NotificationService
from app.repositories.organizer_repository import OrganizerRepository
from app.repositories.package_repository import PackageRepository
from app.repositories.booking_repository import BookingRepository
from app.core.security import get_current_organizer

router = APIRouter(prefix="/organizers", tags=["Organizers Marketplace & Dashboard"])


def _format_org(o: Organizer) -> OrganizerResponse:
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


def _format_pkg(p: Package) -> Dict[str, Any]:
    return {
        "id": p.id,
        "organizer_id": p.organizer_id,
        "title": p.title,
        "destination": p.destination,
        "duration_days": p.duration_days,
        "price_per_person": p.price_per_person,
        "max_travelers": p.max_travelers,
        "description": p.description,
        "inclusions": p.inclusions or [],
        "exclusions": p.exclusions or [],
        "accommodation_type": p.accommodation_type,
        "transportation_type": p.transportation_type,
        "activities": p.activities or [],
        "is_active": p.is_active,
        "image_url": p.image_url,
        "gallery_urls": p.gallery_urls or [],
    }


def _format_booking(b: Booking) -> BookingResponse:
    return BookingResponse(
        id=b.id,
        trip_id=b.trip_id,
        package_id=b.package_id,
        user_id=b.user_id,
        organizer_id=b.organizer_id,
        travelers=b.travelers,
        total_price=b.total_price,
        status=b.status.value if hasattr(b.status, 'value') else b.status,
        notes=b.notes,
        package_title=b.package_title,
        destination=b.destination,
        duration_days=b.duration_days,
        price_per_person=b.price_per_person,
        organizer_name=b.organizer_name,
        traveler_name=b.traveler_name,
        payment_status=b.payment_status.value if hasattr(b.payment_status, 'value') else (b.payment_status or "PENDING"),
        payment_proof_url=b.payment_proof_url,
        created_at=b.created_at.isoformat() if b.created_at else "",
        updated_at=b.updated_at.isoformat() if b.updated_at else "",
    )


class OrganizerProfileUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    location: Optional[str] = None
    website: Optional[str] = None
    destinations: Optional[List[str]] = None
    # Extended fields
    number_of_buses: Optional[int] = None
    vehicle_capacity: Optional[int] = None
    maximum_group_size: Optional[int] = None
    experience_years: Optional[int] = None
    experience_description: Optional[str] = None
    payment_account_title: Optional[str] = None
    payment_account_number: Optional[str] = None
    payment_bank_name: Optional[str] = None
    payment_instructions: Optional[str] = None
    onboarding_completed: Optional[bool] = None


class PackageCreateRequest(BaseModel):
    title: str = Field(..., min_length=3)
    destination: str = Field(..., min_length=2)
    duration_days: int = Field(..., ge=1, le=30)
    price_per_person: float = Field(..., gt=0)
    max_travelers: int = Field(default=15, ge=1)
    description: Optional[str] = None
    inclusions: Optional[List[str]] = None
    exclusions: Optional[List[str]] = None
    accommodation_type: Optional[str] = None
    transportation_type: Optional[str] = None
    activities: Optional[List[str]] = None
    image_url: Optional[str] = None
    gallery_urls: Optional[List[str]] = None


class PackageUpdateRequest(BaseModel):
    title: Optional[str] = None
    destination: Optional[str] = None
    duration_days: Optional[int] = None
    price_per_person: Optional[float] = None
    max_travelers: Optional[int] = None
    description: Optional[str] = None
    inclusions: Optional[List[str]] = None
    exclusions: Optional[List[str]] = None
    accommodation_type: Optional[str] = None
    transportation_type: Optional[str] = None
    activities: Optional[List[str]] = None
    is_active: Optional[bool] = None
    image_url: Optional[str] = None
    gallery_urls: Optional[List[str]] = None


class BookingStatusUpdateRequest(BaseModel):
    status: BookingStatus


# ==============================================================================
# ORGANIZER DASHBOARD ENDPOINTS (Authenticated & Authorized)
# ==============================================================================

@router.get("/me", response_model=OrganizerResponse)
async def get_my_organizer_profile(
    current_organizer: Organizer = Depends(get_current_organizer),
):
    """Retrieve the authenticated organizer's profile."""
    return _format_org(current_organizer)


@router.patch("/me", response_model=OrganizerResponse)
async def update_my_organizer_profile(
    req: OrganizerProfileUpdate,
    current_organizer: Organizer = Depends(get_current_organizer),
    db: AsyncSession = Depends(get_db),
):
    """Update organizer profile details. Verification status is protected from modification."""
    update_data = req.model_dump(exclude_unset=True)
    # Strict Verification Protection: never allow updating is_verified or verification_status
    for forbidden_field in ("is_verified", "verification_status", "rating", "reviews_count"):
        update_data.pop(forbidden_field, None)

    for k, v in update_data.items():
        if v is not None:
            setattr(current_organizer, k, v)

    org_repo = OrganizerRepository(db)
    await org_repo.update(current_organizer)
    await db.commit()
    return _format_org(current_organizer)


@router.get("/me/packages")
async def list_my_packages(
    current_organizer: Organizer = Depends(get_current_organizer),
    db: AsyncSession = Depends(get_db),
):
    """List all packages owned by the authenticated organizer (including inactive)."""
    pkg_repo = PackageRepository(db)
    pkgs = await pkg_repo.list_all(organizer_id=current_organizer.id, include_inactive=True)
    return [_format_pkg(p) for p in pkgs]


@router.post("/me/packages", status_code=status.HTTP_201_CREATED)
async def create_package_for_organizer(
    req: PackageCreateRequest,
    current_organizer: Organizer = Depends(get_current_organizer),
    db: AsyncSession = Depends(get_db),
):
    """Create a new marketplace package strictly attached to the authenticated organizer."""
    pkg_repo = PackageRepository(db)
    pkg_id = f"pkg-{uuid.uuid4().hex[:12]}"
    new_pkg = Package(
        id=pkg_id,
        organizer_id=current_organizer.id,
        title=req.title,
        destination=req.destination,
        duration_days=req.duration_days,
        price_per_person=req.price_per_person,
        max_travelers=req.max_travelers,
        description=req.description,
        inclusions=req.inclusions or [],
        exclusions=req.exclusions or [],
        accommodation_type=req.accommodation_type,
        transportation_type=req.transportation_type,
        activities=req.activities or [],
        is_active=True,
        image_url=req.image_url,
        gallery_urls=req.gallery_urls or [],
    )
    saved_pkg = await pkg_repo.create(new_pkg)
    await db.commit()
    return _format_pkg(saved_pkg)


@router.patch("/me/packages/{package_id}")
async def update_my_package(
    package_id: str,
    req: PackageUpdateRequest,
    current_organizer: Organizer = Depends(get_current_organizer),
    db: AsyncSession = Depends(get_db),
):
    """Update a package. IDOR protected: rejects if package belongs to another organizer."""
    pkg_repo = PackageRepository(db)
    pkg = await pkg_repo.get_by_id(package_id)
    if not pkg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Package not found.")

    if pkg.organizer_id != current_organizer.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You do not have permission to modify another organizer's package.",
        )

    update_dict = req.model_dump(exclude_unset=True)
    for k, v in update_dict.items():
        if v is not None:
            setattr(pkg, k, v)

    await pkg_repo.update(pkg)
    await db.commit()
    return _format_pkg(pkg)


@router.delete("/me/packages/{package_id}")
async def delete_my_package(
    package_id: str,
    current_organizer: Organizer = Depends(get_current_organizer),
    db: AsyncSession = Depends(get_db),
):
    """Deactivate/delete an owned package. IDOR protected."""
    pkg_repo = PackageRepository(db)
    pkg = await pkg_repo.get_by_id(package_id)
    if not pkg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Package not found.")

    if pkg.organizer_id != current_organizer.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You do not have permission to delete another organizer's package.",
        )

    await pkg_repo.delete(pkg)
    await db.commit()
    return {"success": True, "message": f"Package '{package_id}' deleted successfully."}


@router.get("/me/bookings", response_model=List[BookingResponse])
async def list_my_organizer_bookings(
    current_organizer: Organizer = Depends(get_current_organizer),
    db: AsyncSession = Depends(get_db),
):
    """View all traveler booking requests made for this organizer's packages."""
    booking_repo = BookingRepository(db)
    bookings = await booking_repo.get_by_organizer(current_organizer.id)
    return [_format_booking(b) for b in bookings]


@router.patch("/me/bookings/{booking_id}/status", response_model=BookingResponse)
async def update_booking_status_by_organizer(
    booking_id: str,
    req: BookingStatusUpdateRequest,
    current_organizer: Organizer = Depends(get_current_organizer),
    db: AsyncSession = Depends(get_db),
):
    """Confirm, reject, or cancel a booking. IDOR protected."""
    booking_repo = BookingRepository(db)
    booking = await booking_repo.get_by_id(booking_id)
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found.")

    if booking.organizer_id != current_organizer.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You can only manage bookings for your own packages.",
        )

    booking.status = req.status
    await booking_repo.update(booking)

    # Create notifications based on status change
    notif_service = NotificationService(db)
    if req.status == BookingStatus.CONFIRMED:
        await notif_service.notify_booking_confirmed(
            traveler_user_id=booking.user_id,
            booking_id=booking.id,
            package_title=booking.package_title or "",
        )
    elif req.status == BookingStatus.REJECTED:
        await notif_service.notify_booking_rejected(
            traveler_user_id=booking.user_id,
            booking_id=booking.id,
            package_title=booking.package_title or "",
        )

    await db.commit()
    return _format_booking(booking)


@router.patch("/me/bookings/{booking_id}/payment", response_model=BookingResponse)
async def verify_or_reject_payment(
    booking_id: str,
    req: PaymentVerifyRequest,
    current_organizer: Organizer = Depends(get_current_organizer),
    db: AsyncSession = Depends(get_db),
):
    """Verify or reject a traveler's payment proof. IDOR protected."""
    booking_repo = BookingRepository(db)
    booking = await booking_repo.get_by_id(booking_id)
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found.")

    if booking.organizer_id != current_organizer.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You can only verify payments for your own packages.",
        )

    if not booking.payment_proof_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No payment proof has been uploaded for this booking.",
        )

    notif_service = NotificationService(db)

    if req.action == "VERIFY":
        booking.payment_status = PaymentStatus.VERIFIED
        booking.payment_verified_at = datetime.now(timezone.utc)
        booking.payment_verified_by = current_organizer.id
        booking.status = BookingStatus.CONFIRMED

        await notif_service.notify_payment_verified(
            traveler_user_id=booking.user_id,
            booking_id=booking.id,
            package_title=booking.package_title or "",
        )

        # Auto-enroll confirmed traveler into private trip group
        try:
            from app.services.trip_group_service import TripGroupService
            group_service = TripGroupService(db)
            await group_service.enroll_confirmed_traveler(
                package_id=booking.package_id,
                traveler_user_id=booking.user_id,
            )
        except Exception as e:
            # Group enrollment logging
            pass
    elif req.action == "REJECT":
        booking.payment_status = PaymentStatus.REJECTED
        booking.payment_rejection_reason = req.rejection_reason or "Payment proof was not acceptable."

        await notif_service.notify_payment_rejected(
            traveler_user_id=booking.user_id,
            booking_id=booking.id,
            package_title=booking.package_title or "",
            reason=req.rejection_reason or "",
        )

    await booking_repo.update(booking)
    await db.commit()
    return _format_booking(booking)


# ==============================================================================
# PUBLIC DISCOVERY ENDPOINTS
# ==============================================================================

@router.get("", response_model=List[OrganizerResponse])
async def list_organizers(
    destination: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """Public catalog of verified and curated tour organizers."""
    service = MarketplaceService(db)
    if destination:
        orgs = await service.repo.get_by_destination(destination)
    else:
        orgs = await service.list_organizers()
    return [_format_org(o) for o in orgs]


@router.get("/{organizer_id}", response_model=OrganizerResponse)
async def get_organizer(
    organizer_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Public details for a specific tour organizer."""
    service = MarketplaceService(db)
    org = await service.get_organizer(organizer_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organizer not found")
    return _format_org(org)
