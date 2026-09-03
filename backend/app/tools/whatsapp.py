"""Baileys WhatsApp Bot & SMS Notification Tool for Friday Travel Copilot."""

from typing import Dict, Any, Optional, List
from datetime import datetime
import httpx

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger("tools.whatsapp")
settings = get_settings()

BAILEYS_URL = "https://miraculous-analysis-production-eed1.up.railway.app"


class WhatsAppTool:
    """Dispatches WhatsApp messages via deployed Baileys bot microservice with truthful delivery reporting."""

    def __init__(self, service_url: Optional[str] = None):
        configured_url = service_url or getattr(settings, "WHATSAPP_SERVICE_URL", None)
        # If running in production or if configured url is localhost, ensure we use the live Railway URL
        if not configured_url or (settings.is_production and ("127.0.0.1" in configured_url or "localhost" in configured_url)):
            configured_url = BAILEYS_URL
        self.service_url = configured_url.rstrip("/")

    async def send_whatsapp(self, to_number: str, message: str) -> Dict[str, Any]:
        """Send a real WhatsApp message to an organizer or traveler using Baileys bot."""
        if not to_number or not to_number.strip():
            return {
                "success": False,
                "channel": "whatsapp",
                "source_type": "invalid_input",
                "error": "Recipient phone number is required.",
            }

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
                            "channel": "baileys_whatsapp",
                            "source_type": "live",
                            "message_id": data.get("messageId"),
                            "to": clean_to,
                            "status": "delivered",
                            "dispatched_at": datetime.utcnow().isoformat(),
                        }
                    else:
                        return {
                            "success": False,
                            "channel": "baileys_whatsapp",
                            "source_type": "live",
                            "to": clean_to,
                            "status": "queued_waiting_qr",
                            "notice": "WhatsApp bot is not yet paired with phone QR code.",
                        }
        except Exception as e:
            logger.warning(f"Baileys microservice unreachable at {self.service_url}: {e}")

        # Honest failure reporting when microservice is offline
        return {
            "success": False,
            "channel": "baileys_whatsapp",
            "source_type": "unavailable",
            "to": clean_to,
            "status": "service_offline",
            "error": "Baileys WhatsApp microservice is currently offline or unreachable.",
            "dispatched_at": datetime.utcnow().isoformat(),
        }

    async def send_to_multiple(self, phone_numbers: List[str], message: str) -> List[Dict[str, Any]]:
        """Send WhatsApp message to multiple group members simultaneously."""
        results = []
        for phone in phone_numbers:
            if phone and phone.strip():
                res = await self.send_whatsapp(to_number=phone.strip(), message=message)
                results.append(res)
        return results

    async def send_sms(self, to_number: str, message: str) -> Dict[str, Any]:
        """Send carrier SMS notification (returns honest status)."""
        clean_to = to_number.strip().replace("whatsapp:", "").replace("+", "").replace("-", "").replace(" ", "")
        logger.info(f"[SMS DISPATCH NOTICE] To: {clean_to} (Carrier SMS gateway unconfigured)")
        return {
            "success": False,
            "channel": "sms",
            "source_type": "unavailable",
            "to": clean_to,
            "status": "carrier_sms_unconfigured",
            "error": "Direct carrier SMS gateway is not configured in local environment.",
            "dispatched_at": datetime.utcnow().isoformat(),
        }


async def send_whatsapp_message(to_number: str, message: str) -> Dict[str, Any]:
    """Convenience functional wrapper for WhatsApp dispatch."""
    tool = WhatsAppTool()
    return await tool.send_whatsapp(to_number=to_number, message=message)


async def send_whatsapp_to_group(phone_numbers: List[str], message: str) -> List[Dict[str, Any]]:
    """Convenience functional wrapper for multi-traveler WhatsApp dispatch."""
    tool = WhatsAppTool()
    return await tool.send_to_multiple(phone_numbers=phone_numbers, message=message)


async def send_sms_message(to_number: str, message: str) -> Dict[str, Any]:
    """Convenience functional wrapper for SMS dispatch."""
    tool = WhatsAppTool()
    return await tool.send_sms(to_number=to_number, message=message)
