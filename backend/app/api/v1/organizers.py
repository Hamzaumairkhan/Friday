"""Organizers API endpoints — Public catalog & Organizer Dashboard."""

import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

from app.database.database import get_db
from app.models.organizer import Organizer
from app.models.package import Package
from app.models.booking import Booking, BookingStatus
from app.schemas.organizer import OrganizerResponse
from app.schemas.package import PackageCreate, PackageResponse
from app.schemas.booking import BookingResponse
from app.services.marketplace_service import MarketplaceService
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
