"""Multi-tier distributed cache manager supporting Redis with thread-safe in-memory fallback."""

import time
import json
import asyncio
from typing import Any, Optional, Callable, Dict, Tuple
from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger("core.cache")
settings = get_settings()


class InMemoryTTLCache:
    """Thread-safe, high-performance in-memory cache with TTL expiration."""

    def __init__(self, max_size: int = 5000):
        self._cache: Dict[str, Tuple[Any, float]] = {}
        self._max_size = max_size
        self._lock = asyncio.Lock()

    async def get(self, key: str) -> Optional[Any]:
        async with self._lock:
            if key not in self._cache:
                return None
            val, expiry = self._cache[key]
            if time.time() > expiry:
                del self._cache[key]
                return None
            return val

    async def set(self, key: str, value: Any, ttl: int = 300) -> None:
        async with self._lock:
            # Evict expired keys if full
            if len(self._cache) >= self._max_size:
                now = time.time()
                expired = [k for k, (_, exp) in self._cache.items() if now > exp]
                for k in expired:
                    del self._cache[k]
                if len(self._cache) >= self._max_size:
                    # Evict oldest entry
                    oldest_key = next(iter(self._cache))
                    del self._cache[oldest_key]

            self._cache[key] = (value, time.time() + ttl)

    async def delete(self, key: str) -> bool:
        async with self._lock:
            if key in self._cache:
                del self._cache[key]
                return True
            return False

    async def clear(self) -> None:
        async with self._lock:
            self._cache.clear()


class CacheManager:
    """Unified cache interface with automatic Redis detection and memory fallback."""

    def __init__(self):
        self._memory_cache = InMemoryTTLCache()
        self._redis_client = None
        self._redis_available = False
        self._init_attempted = False

    async def _init_redis(self):
        if self._init_attempted:
            return
        self._init_attempted = True
        if settings.REDIS_URL:
            try:
                import redis.asyncio as aioredis
                self._redis_client = aioredis.from_url(
                    settings.REDIS_URL,
                    decode_responses=True,
                    socket_connect_timeout=2.0,
                )
                await self._redis_client.ping()
                self._redis_available = True
                logger.info("Connected to Redis distributed cache.")
            except Exception as e:
                logger.warning(f"Redis unavailable ({e}). Using thread-safe in-memory cache.")
                self._redis_available = False

    async def get(self, key: str) -> Optional[Any]:
        await self._init_redis()
        if self._redis_available and self._redis_client:
            try:
                val = await self._redis_client.get(key)
                if val is not None:
                    try:
                        return json.loads(val)
                    except Exception:
                        return val
                return None
            except Exception as e:
                logger.debug(f"Redis get failed ({e}), falling back to memory.")
        return await self._memory_cache.get(key)

    async def set(self, key: str, value: Any, ttl: int = 300) -> None:
        await self._init_redis()
        if self._redis_available and self._redis_client:
            try:
                serialized = json.dumps(value) if not isinstance(value, str) else value
                await self._redis_client.set(key, serialized, ex=ttl)
                return
            except Exception as e:
                logger.debug(f"Redis set failed ({e}), falling back to memory.")
        await self._memory_cache.set(key, value, ttl=ttl)

    async def delete(self, key: str) -> bool:
        await self._init_redis()
        if self._redis_available and self._redis_client:
            try:
                res = await self._redis_client.delete(key)
                return bool(res)
            except Exception:
                pass
        return await self._memory_cache.delete(key)


cache = CacheManager()
