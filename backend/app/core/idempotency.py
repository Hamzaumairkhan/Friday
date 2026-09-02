"""Distributed idempotency key manager for side-effecting POST endpoints (Bookings & Trips)."""

import json
import time
from typing import Optional, Dict, Any, Tuple
from fastapi import Request, HTTPException, status
from app.core.cache import cache
from app.core.logging import get_logger

logger = get_logger("core.idempotency")

IDEMPOTENCY_PROCESSING_TTL = 120  # 2 minutes lock during execution
IDEMPOTENCY_COMPLETED_TTL = 86400  # 24 hours retention for completed results


class IdempotencyManager:
    """Manages request idempotency tokens across distributed instances."""

    @staticmethod
    def _build_key(user_id: str, endpoint: str, key: str) -> str:
        return f"idempotency:{user_id}:{endpoint}:{key}"

    @classmethod
    async def check_or_lock(
        cls,
        user_id: str,
        endpoint: str,
        idempotency_key: Optional[str],
    ) -> Tuple[bool, Optional[Dict[str, Any]]]:
        """
        Check if idempotency key exists.
        Returns:
            (is_cached, cached_payload)
            If is_cached is True, cached_payload contains {"status_code": int, "data": Any}
        Raises:
            HTTPException(409) if a concurrent request with the same key is currently processing.
        """
        if not idempotency_key:
            return False, None

        cache_key = cls._build_key(user_id, endpoint, idempotency_key)
        existing = await cache.get(cache_key)

        if existing:
            if isinstance(existing, dict) and existing.get("status") == "PROCESSING":
                logger.warning(f"Concurrent idempotent request detected for key '{idempotency_key}' on '{endpoint}'.")
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="A request with this idempotency key is already in progress. Please retry in a few moments.",
                    headers={"Retry-After": "2"},
                )
            if isinstance(existing, dict) and existing.get("status") == "COMPLETED":
                logger.info(f"Idempotent cache HIT for key '{idempotency_key}' on '{endpoint}'.")
                return True, existing.get("payload")

        # Atomically reserve key in PROCESSING state
        await cache.set(
            cache_key,
            {"status": "PROCESSING", "started_at": time.time()},
            ttl=IDEMPOTENCY_PROCESSING_TTL,
        )
        return False, None

    @classmethod
    async def save_result(
        cls,
        user_id: str,
        endpoint: str,
        idempotency_key: Optional[str],
        data: Any,
        status_code: int = 200,
    ) -> None:
        """Store the completed idempotent response payload."""
        if not idempotency_key:
            return

        cache_key = cls._build_key(user_id, endpoint, idempotency_key)
        await cache.set(
            cache_key,
            {
                "status": "COMPLETED",
                "completed_at": time.time(),
                "payload": {"status_code": status_code, "data": data},
            },
            ttl=IDEMPOTENCY_COMPLETED_TTL,
        )
        logger.debug(f"Saved completed idempotent result for key '{idempotency_key}'.")

    @classmethod
    async def unlock_on_error(
        cls,
        user_id: str,
        endpoint: str,
        idempotency_key: Optional[str],
    ) -> None:
        """Release key if the operation failed with an error, allowing safe client retry."""
        if not idempotency_key:
            return
        cache_key = cls._build_key(user_id, endpoint, idempotency_key)
        await cache.delete(cache_key)
