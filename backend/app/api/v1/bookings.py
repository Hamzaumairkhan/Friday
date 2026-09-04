"""Bookings API endpoints with authoritative package and organizer snapshot serialization."""

import asyncio
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional

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
        status=b.status.value if hasattr(b.status, 'value') else str(b.status),
        notes=getattr(b, 'notes', None),
        package_title=getattr(b, 'package_title', None),
        destination=getattr(b, 'destination', None),
        duration_days=getattr(b, 'duration_days', None),
        price_per_person=getattr(b, 'price_per_person', None),
        organizer_name=getattr(b, 'organizer_name', None),
        traveler_name=getattr(b, 'traveler_name', None),
        traveler_email=getattr(b, 'traveler_email', None),
        traveler_phone=getattr(b, 'traveler_phone', None),
        payment_status=b.payment_status.value if hasattr(b.payment_status, 'value') else (str(b.payment_status) if b.payment_status else "PENDING"),
        payment_proof_url=getattr(b, 'payment_proof_url', None),
        created_at=b.created_at.isoformat() if getattr(b, 'created_at', None) else "",
        updated_at=b.updated_at.isoformat() if getattr(b, 'updated_at', None) else "",
    )


from app.core.rate_limiter import rate_limit_booking
from app.core.idempotency import IdempotencyManager


async def _dispatch_booking_alerts_background(
    booking_id: str,
    org_email: Optional[str],
    org_phone: Optional[str],
    org_name: str,
    traveler_name: str,
    traveler_email: Optional[str],
    traveler_phone: Optional[str],
    package_title: str,
    destination: str,
    total_price: float,
    travelers: int,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
):
    """Background task to dispatch emails and WhatsApp alerts without blocking the client."""
    from app.services.email_service import EmailService
    from app.tools.whatsapp import WhatsAppTool
    from app.core.config import get_settings

    cfg = get_settings()
    frontend_base = cfg.FRONTEND_URL or "https://friday-jet-mu.vercel.app"
    portal_url = f"{frontend_base}/organizer/bookings"
    email_svc = EmailService()
    wa_tool = WhatsAppTool()

    # 1. Organizer Email Alert
    if org_email:
        try:
            await email_svc.send_booking_alert_to_organizer(
                booking_id=booking_id,
                organizer_email=org_email,
                organizer_name=org_name,
                traveler_name=traveler_name,
                package_title=package_title,
                destination=destination,
                total_price=total_price,
                travelers=travelers,
            )
            logger.info(f"Dispatched booking alert email to organizer: {org_email}")
        except Exception as e:
            logger.warning(f"Failed to dispatch booking alert email to organizer {org_email}: {e}")

    # 2. Organizer WhatsApp Alert
    if org_phone:
        try:
            wa_msg = (
                f"🎉 *New Tour Booking Request Received!* 🏔️\n\n"
                f"Hello *{org_name}*,\n"
                f"Traveler *{traveler_name}* has requested a reservation for your tour:\n\n"
                f"📌 *Booking ID:* #{booking_id[:8]}\n"
                f"📦 *Tour Package:* {package_title}\n"
                f"📍 *Destination:* {destination}\n"
                f"👥 *Seats Reserved:* {travelers} Traveler(s)\n"
                f"💰 *Total Amount:* PKR {total_price:,.0f}\n\n"
                f"🔗 *Manage in Organizer Portal:* {portal_url}\n\n"
                f"— *Friday AI Travel Marketplace*"
            )
            await wa_tool.send_whatsapp(to_number=org_phone, message=wa_msg)
            logger.info(f"Dispatched booking WhatsApp alert to organizer: {org_phone}")
        except Exception as e:
            logger.warning(f"Failed to dispatch booking WhatsApp alert to organizer {org_phone}: {e}")

    # 3. Traveler Confirmation Email
    if traveler_email:
        try:
            await email_svc.send_booking_confirmation(
                booking_id=booking_id,
                traveler_email=traveler_email,
                traveler_name=traveler_name,
                package_title=package_title,
                destination=destination,
                total_price=total_price,
                travelers=travelers,
                organizer_name=org_name,
                start_date=start_date,
                end_date=end_date,
            )
            logger.info(f"Dispatched booking confirmation email to traveler: {traveler_email}")
        except Exception as e:
            logger.warning(f"Failed to dispatch booking confirmation email to traveler {traveler_email}: {e}")

    # 4. Traveler WhatsApp Confirmation
    if traveler_phone:
        try:
            traveler_msg = (
                f"✅ *Booking Request Initiated!* 🎒\n\n"
                f"Hello *{traveler_name}*,\n"
                f"Your booking request for *{package_title}* in *{destination}* has been submitted.\n\n"
                f"📌 *Booking ID:* #{booking_id[:8]}\n"
                f"👥 *Travelers:* {travelers} Seat(s)\n"
                f"💰 *Total Due:* PKR {total_price:,.0f}\n\n"
                f"Please transfer the amount to the organizer's account and upload your payment proof slip to confirm your reservation.\n\n"
                f"— *Friday AI Travel Marketplace*"
            )
            await wa_tool.send_whatsapp(to_number=traveler_phone, message=traveler_msg)
            logger.info(f"Dispatched booking WhatsApp confirmation to traveler: {traveler_phone}")
        except Exception as e:
            logger.warning(f"Failed to dispatch booking WhatsApp confirmation to traveler {traveler_phone}: {e}")


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

        # Resolve organizer info for notifications
        org_repo = OrganizerRepository(db)
        organizer = await org_repo.get_by_id(booking.organizer_id)
        org_email = organizer.contact_email if organizer else None
        org_phone = organizer.contact_phone or getattr(organizer, 'phone', None) if organizer else None
        org_user_id = organizer.user_id if organizer else None
        org_name = organizer.name if organizer else "Expedition Host"

        if (not org_email or not org_phone) and org_user_id:
            from app.repositories.user_repository import UserRepository
            user_repo = UserRepository(db)
            u = await user_repo.get_by_id(org_user_id)
            if u:
                if not org_email:
                    org_email = u.email
                if not org_phone:
                    org_phone = getattr(u, 'phone', None)

        # In-app notification for organizer
        if org_user_id:
            try:
                notif_service = NotificationService(db)
                await notif_service.notify_new_booking(
                    organizer_user_id=org_user_id,
                    booking_id=booking.id,
                    traveler_name=booking.traveler_name or current_user.name or "A traveler",
                    package_title=booking.package_title or "Tour Package",
                )
            except Exception as ne:
                logger.warning(f"Failed to create in-app booking notification: {ne}")

        # Commit DB immediately to make booking permanent
        await db.commit()

        # Capture values before starting background task
        b_id = booking.id
        b_title = booking.package_title or "Tour Package"
        b_dest = booking.destination or "Pakistan"
        b_total = booking.total_price or 0.0
        b_trav = booking.travelers or 1
        t_name = booking.traveler_name or current_user.name or "Verified Traveler"
        t_email = booking.traveler_email or getattr(current_user, 'email', None)
        t_phone = booking.traveler_phone or getattr(current_user, 'phone', None)
        s_date = getattr(booking, 'start_date', None)
        e_date = getattr(booking, 'end_date', None)

        # Non-blocking async background dispatch for emails & WhatsApp
        asyncio.create_task(_dispatch_booking_alerts_background(
            booking_id=b_id,
            org_email=org_email,
            org_phone=org_phone,
            org_name=org_name,
            traveler_name=t_name,
            traveler_email=t_email,
            traveler_phone=t_phone,
            package_title=b_title,
            destination=b_dest,
            total_price=b_total,
            travelers=b_trav,
            start_date=s_date,
            end_date=e_date,
        ))

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

        # Dispatch email confirmation to traveler
        traveler_email = booking.traveler_email or current_user.email
        if traveler_email:
            try:
                from app.tools.email import EmailTool
                email_tool = EmailTool()
                subject = f"Payment Receipt Received: {booking.package_title or 'Tour Expedition'}"
                body = (
                    f"Dear {booking.traveler_name or current_user.name or 'Traveler'},\n\n"
                    f"We have received your payment proof for '{booking.package_title or 'Tour Expedition'}' (Booking #{booking.id[:8].upper()}).\n\n"
                    f"Your host ({organizer.name if organizer else 'Verified Host'}) has been notified and will verify your transaction shortly.\n"
                    f"Once verified, you will receive full access to your private trip group chat.\n\n"
                    f"Track your booking: http://localhost:5173/my-trips\n\n"
                    f"Safe travels,\nFriday AI Travel Marketplace"
                )
                await email_tool.send_email(to=traveler_email, subject=subject, body=body)
                logger.info(f"Dispatched payment proof confirmation email to traveler: {traveler_email}")
            except Exception as te:
                logger.warning(f"Failed to dispatch payment confirmation email to traveler: {te}")

        # Dispatch WhatsApp notification directly to Organizer
        try:
            from app.tools.whatsapp import WhatsAppTool
            org_wa_phone = organizer.contact_phone or getattr(organizer, 'phone', None)
            if not org_wa_phone and organizer.user_id:
                from app.repositories.user_repository import UserRepository
                user_repo = UserRepository(db)
                u = await user_repo.get_by_id(organizer.user_id)
                if u:
                    org_wa_phone = getattr(u, 'phone', None)

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

        # Also dispatch payment proof receipt to Traveler via WhatsApp
        try:
            traveler_phone = booking.traveler_phone or getattr(current_user, 'phone', None)
            if traveler_phone:
                from app.tools.whatsapp import WhatsAppTool
                wa_tool = WhatsAppTool()
                traveler_msg = (
                    f"🧾 *Payment Proof Received!* ⏳\n\n"
                    f"Hello *{booking.traveler_name or current_user.name or 'Traveler'}*,\n"
                    f"We have received your payment slip for booking #{booking.id[:8]} (*{booking.package_title}*).\n\n"
                    f"Your tour host *{organizer.name}* has been notified to verify your bank transfer.\n"
                    f"Once confirmed, you will automatically get access to the private trip group chat.\n\n"
                    f"— *Friday AI Travel Marketplace*"
                )
                await wa_tool.send_whatsapp(to_number=traveler_phone, message=traveler_msg)
        except Exception as t_wa_err:
            logger.warning(f"Failed to dispatch payment proof WhatsApp to traveler: {t_wa_err}")

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
