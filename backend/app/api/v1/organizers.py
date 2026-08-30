"""Organizers API endpoints — Public catalog & Organizer Dashboard."""

import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
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
from app.core.logging import get_logger

logger = get_logger("api.organizers")

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
        contact_phone=getattr(o, "contact_phone", None) or getattr(o, "phone", None),
        contact_email=getattr(o, "contact_email", None),
        phone=getattr(o, "contact_phone", None) or getattr(o, "phone", None),
        cnic=getattr(o, "cnic", None),
        number_of_buses=o.number_of_buses,
        vehicle_capacity=o.vehicle_capacity,
        maximum_group_size=o.maximum_group_size,
        experience_years=o.experience_years,
        experience_description=o.experience_description,
        onboarding_completed=o.onboarding_completed or False,
        payment_wallet_type=getattr(o, "payment_wallet_type", "BANK"),
        payment_account_title=o.payment_account_title,
        payment_account_number=o.payment_account_number,
        payment_bank_name=o.payment_bank_name,
        payment_instructions=o.payment_instructions,
    )


def _format_pkg(p: Package) -> Dict[str, Any]:
    org = getattr(p, 'organizer', None)
    org_name = (getattr(org, 'name', None) if org else None) or getattr(p, 'organizer_name', None) or "Verified Tour Host"
    org_phone = (getattr(org, 'contact_phone', None) if org else None) or getattr(p, 'contact_phone', None) or "+92 300 1234567"
    org_email = getattr(org, 'contact_email', None) if org else None
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
        "start_date": getattr(p, 'start_date', None),
        "end_date": getattr(p, 'end_date', None),
        "contact_phone": org_phone,
        "organizer_name": org_name,
        "contact_email": org_email,
        "is_active": p.is_active,
        "views_count": int(getattr(p, 'views_count', 0) or 0),
        "rating": float(getattr(p, 'rating', 0.0) or 0.0),
        "reviews_count": int(getattr(p, 'reviews_count', 0) or 0),
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
    cnic: Optional[str] = None
    number_of_buses: Optional[int] = None
    vehicle_capacity: Optional[int] = None
    maximum_group_size: Optional[int] = None
    experience_years: Optional[int] = None
    experience_description: Optional[str] = None
    payment_wallet_type: Optional[str] = None
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
    activities: Optional[List[Any]] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    contact_phone: Optional[str] = None
    organizer_name: Optional[str] = None
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
    activities: Optional[List[Any]] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    contact_phone: Optional[str] = None
    organizer_name: Optional[str] = None
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
    """Update organizer profile details. Propagates name & contact phone to user and packages."""
    update_data = req.model_dump(exclude_unset=True)
    # Strict Verification Protection: never allow updating is_verified or verification_status
    update_data.pop("is_verified", None)
    update_data.pop("verification_status", None)

    for k, v in update_data.items():
        setattr(current_organizer, k, v)

    # 1. Synchronize linked User entity
    if current_organizer.user_id:
        from app.repositories.user_repository import UserRepository
        user_repo = UserRepository(db)
        u = await user_repo.get_by_id(current_organizer.user_id)
        if u:
            if "name" in update_data and update_data["name"]:
                u.name = update_data["name"]
            if "contact_phone" in update_data and update_data["contact_phone"]:
                u.phone = update_data["contact_phone"]
            if "contact_email" in update_data and update_data["contact_email"]:
                u.email = update_data["contact_email"]

    # 2. Synchronize all Packages created by this organizer
    from app.models.package import Package
    from sqlalchemy import update as sa_update
    new_org_name = current_organizer.name
    new_org_phone = current_organizer.contact_phone
    if new_org_name or new_org_phone:
        stmt = sa_update(Package).where(Package.organizer_id == current_organizer.id)
        values_to_update = {}
        if new_org_name:
            values_to_update["organizer_name"] = new_org_name
        if new_org_phone:
            values_to_update["contact_phone"] = new_org_phone
        if values_to_update:
            await db.execute(stmt.values(**values_to_update))

    await db.commit()
    await db.refresh(current_organizer)
    return _format_org(current_organizer)


@router.get("/me/packages")
async def list_my_packages(
    current_organizer: Organizer = Depends(get_current_organizer),
    db: AsyncSession = Depends(get_db),
):
    """List all tour packages created by the authenticated organizer."""
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
    from app.api.v1.trips import _resolve_destination_image
    pkg_repo = PackageRepository(db)
    pkg_id = f"pkg-{uuid.uuid4().hex[:12]}"
    resolved_img = req.image_url or _resolve_destination_image(req.destination or req.title)
    # Resolve authoritative organizer profile & contacts
    from app.repositories.user_repository import UserRepository
    user_repo = UserRepository(db)
    linked_user = await user_repo.get_by_id(current_organizer.user_id) if current_organizer.user_id else None

    org_name = req.organizer_name or current_organizer.name or (linked_user.name if linked_user else None) or "Verified Tour Host"
    org_phone = req.contact_phone or current_organizer.contact_phone or getattr(current_organizer, 'phone', None) or ""
    org_email = (linked_user.email if linked_user and linked_user.email else None) or current_organizer.contact_email

    # Persist updated contact info back to organizer record if missing
    if org_phone and not current_organizer.contact_phone:
        current_organizer.contact_phone = org_phone
    if org_email and not current_organizer.contact_email:
        current_organizer.contact_email = org_email

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
        start_date=req.start_date,
        end_date=req.end_date,
        contact_phone=org_phone,
        organizer_name=org_name,
        is_active=True,
        image_url=resolved_img,
        gallery_urls=req.gallery_urls or [],
    )
    saved_pkg = await pkg_repo.create(new_pkg)
    await db.commit()

    # Dispatch package published confirmation email directly to Organizer's authenticated email
    try:
        from app.services.email_service import EmailService
        if org_email:
            email_svc = EmailService()
            await email_svc.send_organizer_package_published_email(
                organizer_email=org_email,
                organizer_name=org_name,
                package_id=saved_pkg.id,
                package_title=saved_pkg.title,
                destination=saved_pkg.destination,
                duration_days=saved_pkg.duration_days,
                price_per_person=saved_pkg.price_per_person,
            )
    except Exception as e:
        logger.warning(f"Failed to dispatch package published email: {e}")

    # Dispatch package published WhatsApp notification directly to Organizer's verified phone
    try:
        from app.tools.whatsapp import WhatsAppTool
        org_wa_phone = org_phone or current_organizer.contact_phone
        if org_wa_phone:
            wa_tool = WhatsAppTool()
            package_marketplace_url = f"http://localhost:5173/packages/{saved_pkg.id}"
            organizer_portal_url = "http://localhost:5173/organizer/trips"
            wa_message = (
                f"✨ *Your Expedition Has Been Published!* 🚀\n\n"
                f"Hello *{org_name}*,\n"
                f"Your tour package *'{saved_pkg.title}'* for *{saved_pkg.destination}* is now live on the Friday Marketplace!\n\n"
                f"⏱️ *Duration:* {saved_pkg.duration_days} Days\n"
                f"💰 *Price per Person:* PKR {saved_pkg.price_per_person:,.0f}\n"
                f"👥 *Max Capacity:* {saved_pkg.max_travelers} Seats\n\n"
                f"🔗 *View Tour Listing:* {package_marketplace_url}\n"
                f"📲 *Manage in Workspace:* {organizer_portal_url}\n\n"
                f"_Travelers across Pakistan can now discover and book seats._\n"
                f"— *Friday AI Travel Copilot*"
            )
            await wa_tool.send_whatsapp(to_number=org_wa_phone, message=wa_message)
    except Exception as e:
        logger.warning(f"Failed to dispatch package published WhatsApp alert: {e}")

    return _format_pkg(saved_pkg)


@router.patch("/me/packages/{package_id}")
async def update_my_package(
    package_id: str,
    req: PackageUpdateRequest,
    current_organizer: Organizer = Depends(get_current_organizer),
    db: AsyncSession = Depends(get_db),
):
    """Update a package. IDOR protected: rejects if package belongs to another organizer."""
    from app.api.v1.trips import _resolve_destination_image
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

    if not getattr(pkg, 'image_url', None):
        pkg.image_url = _resolve_destination_image(pkg.destination or pkg.title)

    await pkg_repo.update(pkg)
    await db.commit()
    return _format_pkg(pkg)


@router.delete("/me/packages/{package_id}")
async def delete_my_package(
    package_id: str,
    current_organizer: Organizer = Depends(get_current_organizer),
    db: AsyncSession = Depends(get_db),
):
    """Permanently delete an owned tour package and its corresponding trip group, chat messages, and views."""
    from app.models.package import Package, PackageView
    from app.models.trip_group import TripGroup, TripGroupMember, TripGroupMessage
    from app.models.booking import Booking

    pkg_repo = PackageRepository(db)
    pkg = await pkg_repo.get_by_id(package_id)
    if not pkg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Package not found.")

    if pkg.organizer_id != current_organizer.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You do not have permission to delete another organizer's package.",
        )

    # 1. Delete package views
    await db.execute(delete(PackageView).where(PackageView.package_id == package_id))

    # 2. Delete trip group messages, members, and the group itself
    await db.execute(delete(TripGroupMessage).where(TripGroupMessage.group_id.in_(
        select(TripGroup.id).where(TripGroup.package_id == package_id)
    )))
    await db.execute(delete(TripGroupMember).where(TripGroupMember.group_id.in_(
        select(TripGroup.id).where(TripGroup.package_id == package_id)
    )))
    await db.execute(delete(TripGroup).where(TripGroup.package_id == package_id))

    # 3. Delete any bookings for this package
    await db.execute(delete(Booking).where(Booking.package_id == package_id))

    # 4. Delete the package itself
    await pkg_repo.delete(pkg)
    await db.commit()

    return {"success": True, "message": f"Package '{package_id}' and its expedition group chat deleted successfully."}


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
            logger.warning(f"Group enrollment error: {e}")

        # Send confirmed booking & Group Chat invitation email to Traveler
        try:
            from app.services.email_service import EmailService
            from app.repositories.user_repository import UserRepository
            traveler_email = booking.traveler_email
            if not traveler_email and booking.user_id:
                user_repo = UserRepository(db)
                u = await user_repo.get_by_id(booking.user_id)
                if u:
                    traveler_email = u.email

            if traveler_email:
                email_svc = EmailService()
                await email_svc.send_traveler_booking_approved_email(
                    traveler_email=traveler_email,
                    traveler_name=booking.traveler_name or "Traveler",
                    booking_id=booking.id,
                    package_id=booking.package_id,
                    package_title=booking.package_title or "Tour Expedition",
                    destination=booking.destination or "Pakistan",
                    travelers=booking.travelers,
                    total_price=booking.total_price,
                    organizer_name=current_organizer.name or current_organizer.business_name or "Verified Host",
                )
        except Exception as e:
            logger.warning(f"Failed to dispatch booking approved email to traveler: {e}")

        # Send confirmed booking & Group Chat invitation WhatsApp to Traveler
        try:
            from app.tools.whatsapp import WhatsAppTool
            traveler_phone = getattr(booking, 'traveler_phone', None)
            if not traveler_phone and booking.user_id:
                from app.repositories.user_repository import UserRepository
                user_repo = UserRepository(db)
                u = await user_repo.get_by_id(booking.user_id)
                if u and hasattr(u, 'phone'):
                    traveler_phone = u.phone

            if traveler_phone:
                wa_tool = WhatsAppTool()
                group_chat_url = f"http://localhost:5173/groups/{booking.package_id}"
                itinerary_url = f"http://localhost:5173/packages/{booking.package_id}"
                wa_msg = (
                    f"🎉 *Your Tour Booking is Approved!* 🚀\n\n"
                    f"Hello *{booking.traveler_name or 'Traveler'}*,\n"
                    f"Your booking for *'{booking.package_title}'* (*{booking.destination}*) has been confirmed by *{current_organizer.name}*!\n\n"
                    f"📌 *Booking ID:* #{booking.id[:8]}\n"
                    f"👥 *Confirmed Seats:* {booking.travelers} Traveler(s)\n"
                    f"💰 *Total Paid:* PKR {booking.total_price:,.0f}\n\n"
                    f"💬 *Join Expedition Group Chat:* {group_chat_url}\n"
                    f"🗺️ *View Tour Itinerary:* {itinerary_url}\n\n"
                    f"_You are now connected with your tour host and fellow co-travelers._\n"
                    f"— *Friday AI Travel Copilot*"
                )
                await wa_tool.send_whatsapp(to_number=traveler_phone, message=wa_msg)
        except Exception as e:
            logger.warning(f"Failed to dispatch booking approved WhatsApp to traveler: {e}")
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


@router.delete("/me/bookings/{booking_id}")
async def delete_organizer_booking(
    booking_id: str,
    current_organizer: Organizer = Depends(get_current_organizer),
    db: AsyncSession = Depends(get_db),
):
    """Delete a booking reservation for an organizer's package."""
    booking_repo = BookingRepository(db)
    booking = await booking_repo.get_by_id(booking_id)
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found.",
        )

    if booking.organizer_id != current_organizer.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You can only delete bookings for your own tour packages.",
        )

    await booking_repo.delete(booking)
    await db.commit()
    return {"success": True, "message": "Booking reservation deleted successfully."}


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
