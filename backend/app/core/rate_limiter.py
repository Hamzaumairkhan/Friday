"""Lightweight in-memory sliding window rate limiter for FastAPI endpoints."""

import time
from collections import defaultdict
from typing import Dict, List, Tuple
from fastapi import Request, HTTPException, status
from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger("core.rate_limiter")
settings = get_settings()


class SlidingWindowRateLimiter:
    """Thread-safe in-memory sliding window rate limiter."""

    def __init__(self, default_limit: int = 60, window_seconds: int = 60):
        self.default_limit = default_limit
        self.window_seconds = window_seconds
        self.requests: Dict[str, List[float]] = defaultdict(list)

    def is_rate_limited(self, key: str, limit: int) -> Tuple[bool, int, int]:
        """Check if request for key exceeds limit within window. Returns (is_limited, remaining, retry_after)."""
        now = time.time()
        window_start = now - self.window_seconds

        # Clean old timestamps
        timestamps = [t for t in self.requests[key] if t > window_start]
        self.requests[key] = timestamps

        if len(timestamps) >= limit:
            oldest = timestamps[0]
            retry_after = max(1, int(self.window_seconds - (now - oldest)))
            return True, 0, retry_after

        self.requests[key].append(now)
        remaining = max(0, limit - len(self.requests[key]))
        return False, remaining, 0


# Global limiter instance
_global_limiter = SlidingWindowRateLimiter(default_limit=60, window_seconds=60)


async def check_rate_limit(request: Request, limit: int = 30):
    """FastAPI dependency to rate limit sensitive endpoints (e.g. AI chat)."""
    if getattr(settings, "DEBUG", False) and getattr(settings, "DISABLE_RATE_LIMIT", False):
        return

    # Extract client identifier: X-User-Id, Bearer token, or IP address
    user_id = request.headers.get("X-User-Id")
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        user_id = auth.replace("Bearer ", "").strip()

    client_ip = request.client.host if request.client else "unknown_ip"
    client_key = f"{user_id or client_ip}:{request.url.path}"

    is_limited, remaining, retry_after = _global_limiter.is_rate_limited(client_key, limit=limit)

    if is_limited:
        logger.warning(f"Rate limit exceeded for client '{client_key}'. Retry after {retry_after}s.")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded. Please retry after {retry_after} seconds.",
            headers={"Retry-After": str(retry_after), "X-RateLimit-Limit": str(limit)},
        )
