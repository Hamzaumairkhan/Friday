"""Tests for Authentication & User Context."""

from httpx import AsyncClient, ASGITransport
from app.main import app


def test_get_current_user_profile_me(run_async, auth_headers):
    """Test GET /api/v1/auth/me returns the authenticated user profile."""
    async def _test():
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.get("/api/v1/auth/me", headers=auth_headers)
            assert res.status_code == 200
            data = res.json()
            assert "email" in data
            assert data["role"] == "TRAVELER"
            assert data["is_active"] is True

    run_async(_test())


def test_unauthenticated_access_me(run_async):
    """Test GET /api/v1/auth/me without authorization headers returns 401."""
    async def _test():
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.get("/api/v1/auth/me")
            assert res.status_code == 401

    run_async(_test())
