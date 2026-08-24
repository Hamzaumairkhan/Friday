"""Tests for WhatsAppService client against Baileys microservice."""

import pytest
from unittest.mock import AsyncMock, patch
from app.services.whatsapp_service import WhatsAppService


def test_whatsapp_service_status_offline(run_async):
    """When Baileys microservice is not running, status returns available=False gracefully."""
    async def _test():
        service = WhatsAppService(service_url="http://127.0.0.1:39999")
        status = await service.get_status()
        assert status["available"] is False
        assert status["connected"] is False
        assert "error" in status

    run_async(_test())


def test_whatsapp_send_message_offline(run_async):
    """When Baileys microservice is offline, send_message returns service_unavailable."""
    async def _test():
        service = WhatsAppService(service_url="http://127.0.0.1:39999")
        result = await service.send_message(to_number="+923001234567", message="Test message")
        assert result["success"] is False
        assert result["status"] == "service_unavailable"
        assert result["to"] == "923001234567"

    run_async(_test())


def test_whatsapp_pakistan_number_normalization(run_async):
    """Verify that Pakistani 03xx numbers get normalized to 923xx format."""
    async def _test():
        service = WhatsAppService(service_url="http://127.0.0.1:39999")
        result = await service.send_message(to_number="03001234567", message="Test")
        assert result["to"] == "923001234567"

    run_async(_test())


def test_whatsapp_booking_confirmation_offline(run_async):
    """Verify booking confirmation message formatting even when service is offline."""
    async def _test():
        service = WhatsAppService(service_url="http://127.0.0.1:39999")
        result = await service.send_booking_confirmation(
            to_number="+923001234567",
            booking_id="booking-abc-123",
            package_title="Hunza Adventure",
            destination="Hunza",
            total_price=76000.0,
            travelers=2,
        )
        assert result["success"] is False
        assert result["status"] == "service_unavailable"

    run_async(_test())


def test_whatsapp_send_message_delivered(run_async):
    """Verify successful delivery when Baileys microservice responds with 'delivered'."""
    from unittest.mock import MagicMock

    async def _test():
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "status": "delivered",
            "messageId": "msg-001",
        }

        mock_client = AsyncMock()
        mock_client.post.return_value = mock_response
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)

        with patch("httpx.AsyncClient", return_value=mock_client):
            service = WhatsAppService(service_url="http://127.0.0.1:3001")
            result = await service.send_message(to_number="+923001234567", message="Hello from Friday!")
            assert result["success"] is True
            assert result["status"] == "delivered"
            assert result["message_id"] == "msg-001"

    run_async(_test())


def test_whatsapp_service_status_online(run_async):
    """Verify status returns available=True when Baileys microservice is running."""
    from unittest.mock import MagicMock

    async def _test():
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "connected": True,
            "qrReady": False,
            "service": "Baileys WhatsApp Bot",
            "port": 3001,
        }

        mock_client = AsyncMock()
        mock_client.get.return_value = mock_response
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)

        with patch("httpx.AsyncClient", return_value=mock_client):
            service = WhatsAppService(service_url="http://127.0.0.1:3001")
            status = await service.get_status()
            assert status["available"] is True
            assert status["connected"] is True

    run_async(_test())
