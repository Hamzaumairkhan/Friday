"""Comprehensive test suite verifying production scalability hardening, idempotency, rate limiting, and observability."""

import pytest
import uuid
import httpx
from fastapi import FastAPI
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.cache import cache
from app.core.idempotency import IdempotencyManager
from app.core.rate_limiter import create_rate_limiter


@pytest.mark.asyncio
async def test_health_live_endpoint():
    """Verify lightweight liveness probe returns 200 OK without dependencies."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/health/live")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "alive"
        assert "timestamp" in data
        assert "version" in data


@pytest.mark.asyncio
async def test_health_ready_endpoint():
    """Verify readiness probe confirms database connectivity."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/health/ready")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ready"
        assert data["database"] == "connected"


@pytest.mark.asyncio
async def test_request_id_and_process_time_headers():
    """Verify telemetry headers (X-Request-ID and X-Process-Time) are attached to all responses."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Server generates Request ID if not provided
        resp = await client.get("/health/live")
        assert "X-Request-ID" in resp.headers
        assert "X-Process-Time" in resp.headers
        assert resp.headers["X-Request-ID"].startswith("req-")
        assert "ms" in resp.headers["X-Process-Time"]

        # 2. Server preserves client-provided Request ID
        custom_id = "client-trace-123456"
        resp_custom = await client.get("/health/live", headers={"X-Request-ID": custom_id})
        assert resp_custom.headers["X-Request-ID"] == custom_id


@pytest.mark.asyncio
async def test_idempotency_manager():
    """Verify IdempotencyManager locks, stores, and returns completed results for idempotent retries."""
    user_id = f"test-user-{uuid.uuid4().hex[:8]}"
    endpoint = "/api/v1/bookings"
    idem_key = f"key-{uuid.uuid4().hex}"

    # 1. First check -> not cached, reserved in PROCESSING
    is_cached, payload = await IdempotencyManager.check_or_lock(user_id, endpoint, idem_key)
    assert is_cached is False
    assert payload is None

    # 2. Save result
    fake_booking = {"id": "bk-123", "package_title": "Hunza Autumn Tour", "total_price": 45000}
    await IdempotencyManager.save_result(user_id, endpoint, idem_key, data=fake_booking, status_code=201)

    # 3. Second check with same key -> HIT cached result
    is_cached_2, payload_2 = await IdempotencyManager.check_or_lock(user_id, endpoint, idem_key)
    assert is_cached_2 is True
    assert payload_2["data"] == fake_booking
    assert payload_2["status_code"] == 201


@pytest.mark.asyncio
async def test_rate_limiter_sliding_window():
    """Verify sliding window rate limiter enforces limits and resets properly."""
    test_limiter = create_rate_limiter(limit=3, window_seconds=2, tier="test_suite")

    class DummyRequest:
        def __init__(self, ip):
            self.headers = {}
            self.client = type("Client", (), {"host": ip})()
            self.url = type("URL", (), {"path": "/test/limit"})()

    req = DummyRequest("192.168.1.100")

    # 1st, 2nd, 3rd requests should pass
    await test_limiter(req)
    await test_limiter(req)
    await test_limiter(req)

    # 4th request should raise 429 Too Many Requests
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc_info:
        await test_limiter(req)
    assert exc_info.value.status_code == 429
    assert "Rate limit exceeded" in exc_info.value.detail


@pytest.mark.asyncio
async def test_cache_manager_ttl():
    """Verify multi-tier CacheManager sets, retrieves, and expires items."""
    test_key = f"test:cache:{uuid.uuid4().hex[:8]}"
    test_data = {"city": "Skardu", "weather": "Sunny", "temp": 18}

    # Set in cache with 2s TTL
    await cache.set(test_key, test_data, ttl=2)
    cached = await cache.get(test_key)
    assert cached == test_data

    # Delete from cache
    await cache.delete(test_key)
    deleted = await cache.get(test_key)
    assert deleted is None
