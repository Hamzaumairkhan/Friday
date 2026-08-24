"""Booking Agent — structures and creates booking requests for traveler-organizer deals."""

from typing import Dict, Any
from app.services.booking_service import BookingService
from app.schemas.booking import BookingCreate
from app.core.logging import get_logger

logger = get_logger("agents.booking")


class BookingAgent:
    """Manages booking request creation and verification."""

    @classmethod
    async def create_booking(
        cls,
        booking_service: BookingService,
        user_id: str,
        trip_id: str,
        package_id: str,
        travelers: int,
        notes: str | None = None,
    ) -> Dict[str, Any]:
        logger.info(f"Booking agent creating booking for trip={trip_id}, pkg={package_id}")
        data = BookingCreate(
            trip_id=trip_id,
            package_id=package_id,
            travelers=travelers,
            notes=notes,
        )
        booking = await booking_service.create_booking_request(user_id=user_id, data=data)
        return {
            "booking_id": booking.id,
            "status": booking.status.value,
            "total_price": booking.total_price,
            "travelers": booking.travelers,
        }
