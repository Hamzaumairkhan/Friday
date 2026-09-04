"""Email tool using Resend for booking requests and organizer notifications with explicit source transparency."""

from typing import Dict, Any, Optional, List
from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger("tools.email")
settings = get_settings()


class BaseEmailProvider:
    """Base interface for sending emails."""

    async def send(self, to: str, subject: str, body: str, html: Optional[str] = None) -> Dict[str, Any]:
        raise NotImplementedError


class ResendEmailProvider(BaseEmailProvider):
    """Resend live email provider integration."""

    def __init__(self, api_key: str, from_email: str, admin_email: Optional[str] = None):
        self.api_key = api_key
        self.from_email = from_email
        self.admin_email = admin_email or settings.ADMIN_EMAIL

    async def send(self, to: str, subject: str, body: str, html: Optional[str] = None) -> Dict[str, Any]:
        if not to or not to.strip():
            return {
                "success": False,
                "source": "resend",
                "source_type": "invalid_input",
                "data": None,
                "error": "Recipient email cannot be empty.",
            }

        try:
            import resend
            resend.api_key = self.api_key

            target_to = to.strip()
            from_addr = self.from_email
            if not from_addr or "@gmail.com" in from_addr:
                from_addr = "Friday Travel Copilot <onboarding@resend.dev>"

            params = {
                "from": from_addr,
                "to": [target_to],
                "subject": subject,
                "html": html or f"<div style='font-size: 14px; line-height: 1.6; color: #334155; white-space: pre-wrap;'>{body}</div>",
                "text": body,
            }
            response = resend.Emails.send(params)
            email_id = response.get("id") if isinstance(response, dict) else getattr(response, "id", "email-resend-id")

            logger.info(f"Resend live email sent successfully to {target_to}. ID: {email_id}")
            return {
                "success": True,
                "source": "resend",
                "source_type": "live",
                "data": {
                    "id": email_id,
                    "to": target_to,
                    "subject": subject,
                },
                "error": None,
            }
        except Exception as e:
            logger.error(f"Failed to send email via Resend: {e}")
            return {
                "success": False,
                "source": "resend",
                "source_type": "live",
                "data": None,
                "error": f"Resend API error: {str(e)}",
            }


class UnconfiguredEmailProvider(BaseEmailProvider):
    """Honest unconfigured email provider returning unavailable status."""

    async def send(self, to: str, subject: str, body: str, html: Optional[str] = None) -> Dict[str, Any]:
        logger.warning(f"Email dispatch attempted to {to} but RESEND_API_KEY is not configured.")
        return {
            "success": False,
            "source": "resend",
            "source_type": "unavailable",
            "data": None,
            "error": "Resend API key is not configured in the environment.",
        }


class MockEmailProvider(BaseEmailProvider):
    """Mock email provider strictly for automated test suites."""

    async def send(self, to: str, subject: str, body: str, html: Optional[str] = None) -> Dict[str, Any]:
        import uuid
        logger.info(f"[TEST EMAIL DISPATCH] To: {to} | Subject: {subject}")
        return {
            "success": True,
            "source": "test_email_fixture",
            "source_type": "test_fixture",
            "data": {
                "id": f"test-email-{uuid.uuid4().hex[:8]}",
                "to": to,
                "subject": subject,
                "preview": body[:120],
            },
            "error": None,
        }


class SmtpEmailProvider(BaseEmailProvider):
    """Direct SMTP email provider (Gmail SMTP with dual-port 587 STARTTLS and 465 SSL resilience)."""

    def __init__(self, host: str, port: int, user: str, password: str, from_email: str):
        self.host = host
        self.port = port
        self.user = user
        self.password = password
        self.from_email = from_email

    async def send(self, to: str, subject: str, body: str, html: Optional[str] = None) -> Dict[str, Any]:
        import smtplib
        import asyncio
        from email.mime.multipart import MIMEMultipart
        from email.mime.text import MIMEText
        from email.header import Header
        from email.utils import formataddr

        if not to or not to.strip():
            return {"success": False, "source": "smtp", "source_type": "invalid_input", "data": None, "error": "Recipient email cannot be empty."}

        target_to = to.strip()
        sender_email = self.user if ("@" in (self.user or "")) else (self.from_email or self.user)

        def _send_sync():
            clean_subj = subject.replace("—", "-").replace("–", "-")
            msg = MIMEMultipart("alternative")
            msg["Subject"] = Header(clean_subj, "utf-8")
            msg["From"] = formataddr((str(Header("Friday AI Travel Marketplace", "utf-8")), sender_email))
            msg["To"] = target_to
            msg["Reply-To"] = sender_email

            msg.attach(MIMEText(body, "plain", "utf-8"))
            if html:
                msg.attach(MIMEText(html, "html", "utf-8"))

            target_port = int(self.port or 587)
            
            # 1. Primary: Port 587 with STARTTLS (fast, widely supported across cloud & residential ISPs)
            if target_port == 587:
                try:
                    with smtplib.SMTP(self.host, 587, timeout=10.0) as server:
                        server.starttls()
                        server.login(self.user, self.password)
                        server.sendmail(sender_email, [target_to], msg.as_string())
                    return True
                except Exception as e587:
                    logger.warning(f"SMTP port 587 STARTTLS failed ({e587}), trying port 465 SSL...")
                    with smtplib.SMTP_SSL(self.host, 465, timeout=10.0) as server:
                        server.login(self.user, self.password)
                        server.sendmail(sender_email, [target_to], msg.as_string())
                    return True
            else:
                # Direct SSL (port 465)
                try:
                    with smtplib.SMTP_SSL(self.host, target_port, timeout=10.0) as server:
                        server.login(self.user, self.password)
                        server.sendmail(sender_email, [target_to], msg.as_string())
                    return True
                except Exception as e465:
                    logger.warning(f"SMTP SSL port {target_port} failed ({e465}), falling back to 587 STARTTLS...")
                    with smtplib.SMTP(self.host, 587, timeout=10.0) as server:
                        server.starttls()
                        server.login(self.user, self.password)
                        server.sendmail(sender_email, [target_to], msg.as_string())
                    return True

        try:
            loop = asyncio.get_running_loop()
            await loop.run_in_executor(None, _send_sync)
            logger.info(f"Direct Gmail SMTP email delivered successfully to {target_to}")
            return {"success": True, "source": "smtp", "source_type": "live", "data": {"to": target_to, "subject": subject}, "error": None}
        except Exception as e:
            logger.error(f"Gmail SMTP delivery failed to {target_to}: {e}")
            return {"success": False, "source": "smtp", "source_type": "live", "data": None, "error": f"SMTP error: {e}"}


class EmailTool:
    """Unified email tool supporting Resend Live API and Direct Gmail SMTP with automatic resilience."""

    def __init__(self, api_key: Optional[str] = None, from_email: Optional[str] = None, admin_email: Optional[str] = None):
        resend_key = api_key or settings.RESEND_API_KEY
        smtp_user = (settings.SMTP_USER or "").strip()
        smtp_pass = (settings.SMTP_PASSWORD or "").strip()
        self.from_email = from_email or settings.EMAIL_FROM or "noreply@friday.pk"
        self.admin_email = admin_email or settings.ADMIN_EMAIL or "admin@friday.pk"

        self.resend_provider: Optional[ResendEmailProvider] = (
            ResendEmailProvider(api_key=resend_key, from_email=self.from_email, admin_email=self.admin_email)
            if resend_key else None
        )
        self.smtp_provider: Optional[SmtpEmailProvider] = (
            SmtpEmailProvider(
                host=settings.SMTP_HOST or "smtp.gmail.com",
                port=int(settings.SMTP_PORT or 587),
                user=smtp_user,
                password=smtp_pass,
                from_email=self.from_email,
            ) if (smtp_user and smtp_pass) else None
        )

    async def send_email(self, to: str, subject: str, body: str, html: Optional[str] = None) -> Dict[str, Any]:
        """Send an email using Resend (priority cloud deliverability) or direct Gmail SMTP fallback."""
        # 0. Check if a mock or injected provider is set (for testing suites)
        if getattr(self, "provider", None) is not None:
            return await self.provider.send(to=to, subject=subject, body=body, html=html)

        target_to = (to or "").strip()
        admin_addr = getattr(self, "admin_email", None) or getattr(settings, "ADMIN_EMAIL", None)
        if not target_to or any(target_to.endswith(d) for d in ("@friday.local", "@friday.pk", "@example.com")):
            if admin_addr:
                logger.info(f"Redirecting test/dummy recipient '{to}' to configured ADMIN_EMAIL '{admin_addr}'")
                target_to = admin_addr

        # 1. Try Resend if configured
        if self.resend_provider:
            res = await self.resend_provider.send(to=target_to, subject=subject, body=body, html=html)
            if res.get("success"):
                return res
            logger.warning(f"Resend dispatch failed ({res.get('error')}), trying SMTP fallback...")

        # 2. Try SMTP if configured
        if self.smtp_provider:
            res = await self.smtp_provider.send(to=target_to, subject=subject, body=body, html=html)
            if res.get("success"):
                return res
            logger.warning(f"SMTP dispatch failed: {res.get('error')}")

        return {
            "success": False,
            "source": "unconfigured",
            "source_type": "unavailable",
            "data": None,
            "error": "Neither Resend nor SMTP credentials delivered the email.",
        }


async def send_email(to: str, subject: str, body: str, html: Optional[str] = None) -> Dict[str, Any]:
    """Convenience functional wrapper for email tool."""
    tool = EmailTool()
    return await tool.send_email(to=to, subject=subject, body=body, html=html)
