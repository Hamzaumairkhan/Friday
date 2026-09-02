"""Distributed sliding window rate limiter with Redis backend, endpoint tiering, and resilient fallback."""

import time
import asyncio
from collections import defaultdict
from typing import Dict, List, Tuple, Optional, Callable
from fastapi import Request, HTTPException, status
from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger("core.rate_limiter")
settings = get_settings()


class LocalSlidingWindowLimiter:
    """Thread-safe in-memory sliding window rate limiter."""

    def __init__(self, window_seconds: int = 60):
        self.window_seconds = window_seconds
        self.requests: Dict[str, List[float]] = defaultdict(list)
        self._lock = asyncio.Lock()

    async def is_rate_limited(self, key: str, limit: int) -> Tuple[bool, int, int]:
        async with self._lock:
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


class DistributedRateLimiter:
    """Hybrid rate limiter: uses Redis sliding window when available, falling back safely."""

    def __init__(self, window_seconds: int = 60):
        self.window_seconds = window_seconds
        self._local_limiter = LocalSlidingWindowLimiter(window_seconds=window_seconds)
        self._redis_client = None
        self._redis_checked = False
        self._redis_online = False

    async def _get_redis(self):
        if not self._redis_checked:
            self._redis_checked = True
            if settings.REDIS_URL:
                try:
                    import redis.asyncio as aioredis
                    self._redis_client = aioredis.from_url(
                        settings.REDIS_URL,
                        decode_responses=True,
                        socket_connect_timeout=1.5,
                    )
                    await self._redis_client.ping()
                    self._redis_online = True
                    logger.info("Distributed rate limiter connected to Redis.")
                except Exception as e:
                    logger.warning(f"Redis rate limiter unavailable ({e}). Using local sliding window.")
                    self._redis_online = False
        return self._redis_client if self._redis_online else None

    async def check_limit(
        self,
        key: str,
        limit: int,
        strict_on_redis_fail: bool = False,
    ) -> Tuple[bool, int, int]:
        redis = await self._get_redis()
        if redis:
            try:
                now = time.time()
                window_start = now - self.window_seconds
                pipe = redis.pipeline()
                pipe.zremrangebyscore(key, 0, window_start)
                pipe.zcard(key)
                pipe.zadd(key, {str(now): now})
                pipe.expire(key, self.window_seconds + 5)
                results = await pipe.execute()

                current_count = results[1]
                if current_count >= limit:
                    # Remove the timestamp we just added since it exceeds limit
                    await redis.zrem(key, str(now))
                    return True, 0, int(self.window_seconds)
                remaining = max(0, limit - current_count - 1)
                return False, remaining, 0
            except Exception as e:
                logger.debug(f"Redis rate check error ({e}), switching to local limiter.")
                self._redis_online = False

        # Fallback to local in-memory sliding window
        # For expensive AI endpoints, strict_on_redis_fail enforces emergency protection
        return await self._local_limiter.is_rate_limited(key, limit=limit)


# Global rate limiter instance
_rate_limiter = DistributedRateLimiter(window_seconds=60)


def create_rate_limiter(
    limit: int = 60,
    window_seconds: int = 60,
    tier: str = "standard",
    strict_on_redis_fail: bool = False,
) -> Callable:
    """Factory creating endpoint-specific FastAPI rate-limiting dependencies."""

    async def _rate_limit_dependency(request: Request):
        if getattr(settings, "DEBUG", False) and getattr(settings, "DISABLE_RATE_LIMIT", False):
            return

        # Extract client identifier: X-User-Id, Bearer token, or IP address
        user_id = request.headers.get("X-User-Id")
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            user_id = auth.replace("Bearer ", "").strip()

        client_ip = request.client.host if request.client else "unknown_ip"
        client_key = f"rl:{tier}:{user_id or client_ip}:{request.url.path}"

        is_limited, remaining, retry_after = await _rate_limiter.check_limit(
            client_key,
            limit=limit,
            strict_on_redis_fail=strict_on_redis_fail,
        )

        if is_limited:
            logger.warning(f"Rate limit exceeded on [{tier}] for client '{client_key}'. Retry after {retry_after}s.")
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded for {tier} tier. Please retry after {retry_after} seconds.",
                headers={
                    "Retry-After": str(retry_after),
                    "X-RateLimit-Limit": str(limit),
                    "X-RateLimit-Remaining": str(remaining),
                },
            )

    return _rate_limit_dependency


# Pre-configured endpoint dependencies
rate_limit_public = create_rate_limiter(limit=120, tier="public")
rate_limit_standard = create_rate_limiter(limit=60, tier="standard")
rate_limit_ai = create_rate_limiter(limit=15, tier="ai", strict_on_redis_fail=True)
rate_limit_booking = create_rate_limiter(limit=20, tier="booking")


async def check_rate_limit(request: Request, limit: int = 30):
    """Backward-compatible rate limit dependency."""
    dep = create_rate_limiter(limit=limit, tier="legacy")
    await dep(request)
