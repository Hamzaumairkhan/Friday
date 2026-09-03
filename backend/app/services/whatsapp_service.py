"""WhatsApp Service communicating with isolated local Baileys microservice."""

from typing import Dict, Any, Optional, List
from datetime import datetime
import httpx

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger("services.whatsapp")
settings = get_settings()

DEFAULT_WHATSAPP_SERVICE_URL = "https://miraculous-analysis-production-eed1.up.railway.app"


class WhatsAppService:
    """Isolated WhatsApp service client interacting with Baileys microservice."""

    def __init__(self, service_url: Optional[str] = None):
        self.service_url = service_url or getattr(settings, "WHATSAPP_SERVICE_URL", DEFAULT_WHATSAPP_SERVICE_URL)

    async def get_status(self) -> Dict[str, Any]:
        """Query Baileys microservice connection and QR pairing status."""
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                resp = await client.get(f"{self.service_url}/status")
                if resp.status_code == 200:
                    data = resp.json()
                    return {
                        "available": True,
                        "connected": data.get("connected", False),
                        "qr_ready": data.get("qrReady", False),
                        "service": data.get("service", "Baileys WhatsApp Bot"),
                        "port": data.get("port", 3001),
                    }
        except Exception as e:
            logger.debug(f"WhatsApp Baileys service not reachable at {self.service_url}: {e}")

        return {
            "available": False,
            "connected": False,
            "qr_ready": False,
            "service": "Baileys WhatsApp Bot (Offline)",
            "error": "WhatsApp local service is not running. Start with 'node whatsapp_service/server.js'",
        }

    async def send_message(self, to_number: str, message: str) -> Dict[str, Any]:
        """Dispatch a message to a WhatsApp recipient and return truthful status."""
        clean_to = to_number.strip().replace("whatsapp:", "").replace("+", "").replace("-", "").replace(" ", "")
        if clean_to.startswith("03"):
            clean_to = f"92{clean_to[1:]}"

        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                resp = await client.post(
                    f"{self.service_url}/send-message",
                    json={"to": clean_to, "message": message},
                )
                if resp.status_code == 200:
                    data = resp.json()
                    status = data.get("status")
                    if status == "delivered":
                        return {
                            "success": True,
                            "status": "delivered",
                            "message_id": data.get("messageId"),
                            "to": clean_to,
                            "dispatched_at": datetime.utcnow().isoformat(),
                        }
                    else:
                        # Message queued waiting for QR scan
                        return {
                            "success": False,
                            "status": "queued_waiting_qr",
                            "to": clean_to,
                            "note": "WhatsApp bot is not yet paired. Please scan terminal QR code.",
                        }
        except Exception as e:
            logger.warning(f"WhatsApp dispatch attempt failed: {e}")

        return {
            "success": False,
            "status": "service_unavailable",
            "to": clean_to,
            "error": "Baileys WhatsApp microservice is unreachable.",
        }

    async def send_booking_confirmation(
        self,
        to_number: str,
        booking_id: str,
        package_title: str,
        destination: str,
        total_price: float,
        travelers: int,
    ) -> Dict[str, Any]:
        """Format and dispatch structured booking notification."""
        msg = (
            f"🌄 *FRIDAY TRAVEL MARKETPLACE — BOOKING CONFIRMATION*\n\n"
            f"📌 *Booking ID*: #{booking_id[:8]}\n"
            f"📍 *Destination*: {destination}\n"
            f"📦 *Package*: {package_title}\n"
            f"👥 *Travelers*: {travelers} persons\n"
            f"💰 *Total Amount*: Rs. {total_price:,.0f}\n\n"
            f"Your trip booking is registered with our verified local organizer. Safe travels!"
        )
        return await self.send_message(to_number=to_number, message=msg)
