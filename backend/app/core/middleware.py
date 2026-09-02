"""Production telemetry & request tracing middleware for Friday."""

import time
import uuid
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from app.core.logging import get_logger

logger = get_logger("core.middleware")


class RequestIdMiddleware(BaseHTTPMiddleware):
    """Injects unique correlation IDs, measures request latency, and outputs structured access logs."""

    async def dispatch(self, request: Request, call_next) -> Response:
        start_time = time.perf_counter()

        # Extract existing client-provided request ID or generate a new UUID4
        request_id = request.headers.get("X-Request-ID") or f"req-{uuid.uuid4().hex[:12]}"
        request.state.request_id = request_id

        # Process request
        try:
            response = await call_next(request)
        except Exception as exc:
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
            logger.error(
                f"[{request_id}] {request.method} {request.url.path} -> 500 Internal Error ({duration_ms}ms): {exc}"
            )
            raise

        # Calculate execution duration
        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)

        # Attach telemetry headers to response
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Process-Time"] = f"{duration_ms}ms"

        # Structured access log for non-health requests or slow health queries
        if not request.url.path.startswith("/health/live"):
            logger.info(
                f"[{request_id}] {request.method} {request.url.path} -> {response.status_code} ({duration_ms}ms)"
            )

        return response
