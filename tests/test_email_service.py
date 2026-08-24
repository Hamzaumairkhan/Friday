"""Tests for EmailService transactional workflows."""

import pytest
from app.services.email_service import EmailService
from app.tools.email import MockEmailProvider, EmailTool


def test_email_service_booking_confirmation(run_async):
    """Verify booking confirmation email formatting and delivery via EmailService."""
    async def _test():
        tool = EmailTool()
        tool.provider = MockEmailProvider()
        service = EmailService(email_tool=tool)

        res = await service.send_booking_confirmation(
            booking_id="booking-abc-123",
            traveler_email="traveler@example.com",
            traveler_name="Hamza Khan",
            package_title="Hunza Highlights 4-Day Adventure",
            destination="Hunza",
            total_price=76000.0,
            travelers=2,
        )
        assert res["success"] is True
        assert "id" in res["data"]
        assert res["data"]["to"] == "traveler@example.com"
        assert "Hunza" in res["data"]["subject"]

    run_async(_test())


def test_email_service_booking_status_update(run_async):
    """Verify booking status change email dispatch."""
    async def _test():
        tool = EmailTool()
        tool.provider = MockEmailProvider()
        service = EmailService(email_tool=tool)

        res = await service.send_booking_status_update(
            booking_id="booking-xyz-999",
            traveler_email="traveler@example.com",
            traveler_name="Hamza Khan",
            new_status="confirmed",
            notes="Your jeep driver will pick you up at 7:00 AM from Islamabad.",
        )
        assert res["success"] is True
        assert "CONFIRMED" in res["data"]["subject"]

    run_async(_test())


def test_email_service_itinerary_delivery(run_async):
    """Verify structured itinerary delivery via EmailService."""
    async def _test():
        tool = EmailTool()
        tool.provider = MockEmailProvider()
        service = EmailService(email_tool=tool)

        itinerary_days = [
            {"day_number": 1, "title": "Islamabad to Hunza", "summary": "Scenic drive via KKH."},
            {"day_number": 2, "title": "Attabad Lake & Passu", "summary": "Boating and bridge crossing."},
        ]
        budget_summary = {"total_estimated": 80000.0, "total_per_person": 40000.0}

        res = await service.send_itinerary(
            trip_id="trip-123",
            traveler_email="traveler@example.com",
            traveler_name="Hamza Khan",
            destination="Hunza",
            duration=2,
            itinerary_days=itinerary_days,
            budget_summary=budget_summary,
        )
        assert res["success"] is True
        assert "Hunza" in res["data"]["subject"]

    run_async(_test())
