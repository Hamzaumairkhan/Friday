"""Email Service implementing Resend-powered transactional email workflows."""

from typing import Dict, Any, Optional, List
from app.tools.email import EmailTool
from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger("services.email")
settings = get_settings()


class EmailService:
    """High-level transactional email service for Friday platform."""

    def __init__(self, email_tool: Optional[EmailTool] = None):
        self.email_tool = email_tool or EmailTool()

    async def send_booking_confirmation(
        self,
        booking_id: str,
        traveler_email: str,
        traveler_name: str,
        package_title: str,
        destination: str,
        total_price: float,
        travelers: int,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Send booking confirmation and receipt to traveler and organizer."""
        subject = f"Booking Confirmation #{booking_id[:8]} — {package_title} ({destination})"
        body = (
            f"Dear {traveler_name},\n\n"
            f"Thank you for booking with Friday — AI Travel Copilot & Marketplace for Pakistan!\n\n"
            f"=== BOOKING CONFIRMATION ===\n"
            f"• Booking ID: {booking_id}\n"
            f"• Destination: {destination}\n"
            f"• Package: {package_title}\n"
            f"• Number of Travelers: {travelers} persons\n"
            f"• Total Price: Rs. {total_price:,.0f}\n"
            f"• Dates: {start_date or 'TBD'} to {end_date or 'TBD'}\n"
            f"• Status: CONFIRMED\n\n"
            f"Your verified local tour organizer has been notified. Have an unforgettable journey!\n\n"
            f"Warm regards,\n"
            f"Friday Travel Team"
        )
        return await self.email_tool.send_email(to=traveler_email, subject=subject, body=body)

    async def send_booking_status_update(
        self,
        booking_id: str,
        traveler_email: str,
        traveler_name: str,
        new_status: str,
        notes: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Notify traveler regarding status change (e.g. APPROVED, CONFIRMED, CANCELLED)."""
        subject = f"Booking #{booking_id[:8]} Status Update: {new_status.upper()}"
        body = (
            f"Dear {traveler_name},\n\n"
            f"The status of your Friday booking #{booking_id[:8]} has been updated to: {new_status.upper()}.\n\n"
            f"Organizer Notes: {notes or 'No additional notes provided.'}\n\n"
            f"Log in to your Friday dashboard anytime for live updates.\n\n"
            f"Best regards,\n"
            f"Friday Travel Team"
        )
        return await self.email_tool.send_email(to=traveler_email, subject=subject, body=body)

    async def send_itinerary(
        self,
        trip_id: str,
        traveler_email: str,
        traveler_name: str,
        destination: str,
        duration: int,
        itinerary_days: List[Dict[str, Any]],
        budget_summary: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Send complete structured day-by-day travel plan and budget breakdown."""
        subject = f"Your {duration}-Day {destination} Travel Itinerary — Friday AI Copilot"
        
        days_text = ""
        for day in itinerary_days:
            day_num = day.get("day_number", 1)
            title = day.get("title", f"Day {day_num}")
            summary = day.get("summary", "")
            days_text += f"\n[Day {day_num}: {title}]\n{summary}\n"

        budget_text = ""
        if budget_summary:
            budget_text = f"\nEstimated Total Cost: Rs. {budget_summary.get('total_estimated', 0):,.0f}\nPer Person: Rs. {budget_summary.get('total_per_person', 0):,.0f}\n"

        body = (
            f"Dear {traveler_name},\n\n"
            f"Here is your AI-crafted {duration}-day trip itinerary for {destination}:\n\n"
            f"{days_text}\n"
            f"=== BUDGET SUMMARY ===\n"
            f"{budget_text}\n"
            f"Ready to travel? Discover verified local tour organizers in the Friday Marketplace!\n\n"
            f"Safe travels,\n"
            f"Friday AI Travel Copilot"
        )
        return await self.email_tool.send_email(to=traveler_email, subject=subject, body=body)
