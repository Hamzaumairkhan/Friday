"""Bookings API endpoints with authoritative package and organizer snapshot serialization."""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.database.database import get_db
from app.schemas.booking import BookingCreate, BookingResponse
from app.schemas.payment import PaymentProofSubmit
from app.models.booking import PaymentStatus
from app.models.organizer import Organizer
from app.services.booking_service import BookingService
from app.services.notification_service import NotificationService
from app.repositories.booking_repository import BookingRepository
from app.repositories.organizer_repository import OrganizerRepository
from app.core.security import get_current_user_id, get_current_user
from app.models.user import User
from app.core.logging import get_logger

logger = get_logger("api.bookings")
router = APIRouter(prefix="/bookings", tags=["Bookings"])


def _format_booking(b) -> BookingResponse:
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
        traveler_email=getattr(b, 'traveler_email', None),
        traveler_phone=getattr(b, 'traveler_phone', None),
        payment_status=b.payment_status.value if hasattr(b.payment_status, 'value') else (b.payment_status or "PENDING"),
        payment_proof_url=b.payment_proof_url,
        created_at=b.created_at.isoformat() if b.created_at else "",
        updated_at=b.updated_at.isoformat() if b.updated_at else "",
    )


from app.core.rate_limiter import rate_limit_booking
from app.core.idempotency import IdempotencyManager


@router.post("", response_model=BookingResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(rate_limit_booking)])
async def create_booking(
    req: BookingCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    idempotency_key = request.headers.get("X-Idempotency-Key")
    is_cached, cached_payload = await IdempotencyManager.check_or_lock(
        user_id=current_user.id,
        endpoint="/api/v1/bookings",
        idempotency_key=idempotency_key,
    )
    if is_cached and cached_payload:
        return cached_payload.get("data")

    # Organizer accounts cannot create bookings
    if current_user.role and (current_user.role.value if hasattr(current_user.role, 'value') else current_user.role) == 'ORGANIZER':
        await IdempotencyManager.unlock_on_error(current_user.id, "/api/v1/bookings", idempotency_key)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Organizer accounts cannot book tours. Please use a Traveler account to make a booking.",
        )

    try:
        service = BookingService(db)
        booking = await service.create_booking_request(user_id=current_user.id, data=req)

        # Create notification for organizer
        org_repo = OrganizerRepository(db)
        organizer = await org_repo.get_by_id(booking.organizer_id)
        if organizer and organizer.user_id:
            notif_service = NotificationService(db)
            await notif_service.notify_new_booking(
                organizer_user_id=organizer.user_id,
                booking_id=booking.id,
                traveler_name=booking.traveler_name or "A traveler",
                package_title=booking.package_title or "a package",
            )

        await db.commit()
        response_dto = _format_booking(booking)
        await IdempotencyManager.save_result(
            user_id=current_user.id,
            endpoint="/api/v1/bookings",
            idempotency_key=idempotency_key,
            data=response_dto.model_dump(),
            status_code=201,
        )
        return response_dto
    except Exception:
        await IdempotencyManager.unlock_on_error(current_user.id, "/api/v1/bookings", idempotency_key)
        raise


@router.get("", response_model=List[BookingResponse])
async def list_user_bookings(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    service = BookingService(db)
    bookings = await service.list_user_bookings(user_id=user_id)
    return [_format_booking(b) for b in bookings]


@router.get("/{booking_id}", response_model=BookingResponse)
async def get_booking(
    booking_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    service = BookingService(db)
    booking = await service.get_booking(booking_id=booking_id, user_id=user_id)
    return _format_booking(booking)


@router.post("/{booking_id}/payment-proof", response_model=BookingResponse)
async def submit_payment_proof(
    booking_id: str,
    req: PaymentProofSubmit,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Submit Cloudinary URL as payment proof. Only booking owner can submit."""
    booking_repo = BookingRepository(db)
    booking = await booking_repo.get_by_id(booking_id)
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found.")
    if booking.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only submit payment for your own booking.")

    booking.payment_proof_url = req.payment_proof_url
    booking.payment_status = PaymentStatus.PROOF_UPLOADED
    booking.payment_uploaded_at = datetime.now(timezone.utc)
    await booking_repo.update(booking)

    # Notify organizer via in-app notification & transactional email
    org_repo = OrganizerRepository(db)
    organizer = await org_repo.get_by_id(booking.organizer_id)
    if organizer:
        if organizer.user_id:
            notif_service = NotificationService(db)
            await notif_service.notify_payment_uploaded(
                organizer_user_id=organizer.user_id,
                booking_id=booking.id,
                traveler_name=booking.traveler_name or current_user.name or "A traveler",
            )

        # Dispatch email alert to organizer
        try:
            from app.services.email_service import EmailService
            org_email = organizer.contact_email
            if not org_email and organizer.user_id:
                from app.repositories.user_repository import UserRepository
                user_repo = UserRepository(db)
                u = await user_repo.get_by_id(organizer.user_id)
                if u:
                    org_email = u.email

            if org_email:
                email_svc = EmailService()
                await email_svc.send_organizer_payment_uploaded_email(
                    organizer_email=org_email,
                    organizer_name=getattr(organizer, 'name', 'Expedition Host') or "Expedition Host",
                    booking_id=booking.id,
                    traveler_name=booking.traveler_name or current_user.name or "Traveler",
                    traveler_phone=booking.traveler_phone or getattr(current_user, 'phone', '') or "",
                    package_title=booking.package_title or "Tour Expedition",
                    destination=booking.destination or "Pakistan",
                    travelers=booking.travelers,
                    total_price=booking.total_price,
                )
        except Exception as e:
            logger.warning(f"Failed to dispatch payment proof email to organizer: {e}")

        # Dispatch WhatsApp notification directly to Organizer
        try:
            from app.tools.whatsapp import WhatsAppTool
            org_wa_phone = organizer.contact_phone or getattr(organizer, 'phone', None)
            if org_wa_phone:
                wa_tool = WhatsAppTool()
                organizer_portal_url = "http://localhost:5173/organizer/bookings"
                wa_message = (
                    f"💳 *New Payment Proof Received!* 🚀\n\n"
                    f"Hello *{organizer.name}*,\n"
                    f"Traveler *{booking.traveler_name or current_user.name or 'A traveler'}* has uploaded payment proof for your tour:\n\n"
                    f"📌 *Booking ID:* #{booking.id[:8]}\n"
                    f"📦 *Tour Package:* {booking.package_title}\n"
                    f"📍 *Destination:* {booking.destination}\n"
                    f"👥 *Travelers:* {booking.travelers} Seat(s)\n"
                    f"💰 *Total Paid Amount:* PKR {booking.total_price:,.0f}\n\n"
                    f"🔗 *Review & Approve Booking:* {organizer_portal_url}\n\n"
                    f"_Please verify the receipt and confirm the reservation to add the traveler to your group chat._\n"
                    f"— *Friday AI Travel Copilot*"
                )
                await wa_tool.send_whatsapp(to_number=org_wa_phone, message=wa_message)
        except Exception as e:
            logger.warning(f"Failed to dispatch payment proof WhatsApp to organizer: {e}")

    await db.commit()
    return _format_booking(booking)


@router.get("/{booking_id}/payment-proof")
async def get_payment_proof(
    booking_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get payment proof details for a booking. Only booking owner can view."""
    booking_repo = BookingRepository(db)
    booking = await booking_repo.get_by_id(booking_id)
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found.")
    if booking.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    # Also return organizer payment info
    org_repo = OrganizerRepository(db)
    organizer = await org_repo.get_by_id(booking.organizer_id)

    return {
        "booking_id": booking.id,
        "payment_status": booking.payment_status.value if hasattr(booking.payment_status, 'value') else (booking.payment_status or "PENDING"),
        "payment_proof_url": booking.payment_proof_url,
        "payment_uploaded_at": booking.payment_uploaded_at.isoformat() if booking.payment_uploaded_at else None,
        "payment_verified_at": booking.payment_verified_at.isoformat() if booking.payment_verified_at else None,
        "payment_rejection_reason": booking.payment_rejection_reason,
        "total_price": booking.total_price,
        "organizer_payment_info": {
            "name": organizer.name if organizer else "Tour Operator",
            "payment_wallet_type": organizer.payment_wallet_type if organizer else None,
            "payment_bank_name": organizer.payment_bank_name if organizer else None,
            "payment_account_title": organizer.payment_account_title if organizer else None,
            "payment_account_number": organizer.payment_account_number if organizer else None,
            "instructions": organizer.payment_instructions if organizer else None,
            "contact_phone": organizer.contact_phone if organizer else None,
        } if organizer else None,
    }
