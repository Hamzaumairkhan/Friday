"""Centralized exception definitions and handlers with robust multi-signature support."""

from typing import Optional
from fastapi import Request
from fastapi.responses import JSONResponse


class FridayError(Exception):
    """Base exception for Friday application."""

    def __init__(self, message: str, status_code: int = 500):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class NotFoundError(FridayError):
    """Resource not found exception supporting both single message or (resource, resource_id) signatures."""

    def __init__(self, resource_or_message: str, resource_id: Optional[str] = None):
        if resource_id is not None:
            msg = f"{resource_or_message} with id '{resource_id}' not found"
        else:
            msg = resource_or_message
        super().__init__(message=msg, status_code=404)


class AuthenticationError(FridayError):
    """Authentication failure."""

    def __init__(self, message: str = "Authentication failed"):
        super().__init__(message=message, status_code=401)


class AuthorizationError(FridayError):
    """Authorization failure."""

    def __init__(self, message: str = "You do not have permission to perform this action"):
        super().__init__(message=message, status_code=403)


class ValidationError(FridayError):
    """Validation failure."""

    def __init__(self, message: str):
        super().__init__(message=message, status_code=422)


class ExternalServiceError(FridayError):
    """External service failure (API, LLM, etc.)."""

    def __init__(self, service: str, message: str = "Service unavailable"):
        super().__init__(
            message=f"External service '{service}' error: {message}",
            status_code=502,
        )


class ToolExecutionError(FridayError):
    """Tool execution failure."""

    def __init__(self, tool: str, message: str):
        super().__init__(
            message=f"Tool '{tool}' failed: {message}",
            status_code=500,
        )


class LLMError(FridayError):
    """LLM provider failure."""

    def __init__(self, provider: str, message: str = "LLM call failed"):
        super().__init__(
            message=f"LLM provider '{provider}' error: {message}",
            status_code=502,
        )


# --- FastAPI exception handlers ---

async def friday_error_handler(request: Request, exc: FridayError) -> JSONResponse:
    """Handle all FridayError subtypes without leaking internal stack traces or secrets."""
    # Sanitize message to ensure no secret API keys are reflected
    sanitized_msg = str(exc.message)
    for key_pattern in ("gsk_", "AIzaSy", "tvly-", "re_", "lsv2_"):
        if key_pattern in sanitized_msg:
            sanitized_msg = "[Internal API credentials redacted from error message]"

    origin = request.headers.get("origin") or "*"
    headers = {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Methods": "*",
        "Access-Control-Allow-Headers": "*",
    }

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": type(exc).__name__,
            "message": sanitized_msg,
            "status_code": exc.status_code,
        },
        headers=headers,
    )
