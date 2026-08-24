"""Pytest test configuration and database fixtures using shared test SQLite database."""

import asyncio
import os
import sys
import pytest

# Ensure backend root is on sys.path
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import text

# Import all models so metadata is complete
import app.models  # noqa: F401
from app.database.base import Base
from app.database.database import get_db, _auto_migrate_sqlite
from app.main import app

TEST_DB_PATH = os.path.join(backend_path, "data", "test_friday.db")
TEST_DATABASE_URL = f"sqlite+aiosqlite:///{TEST_DB_PATH}"

test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
TestSessionLocal = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)


@pytest.fixture(autouse=True)
def mock_external_apis(monkeypatch):
    """Ensure automated unit tests run predictably without external network flakiness."""
    from app.tools.email import MockEmailProvider
    monkeypatch.setattr("app.tools.email.EmailTool.__init__", lambda self, *args, **kwargs: setattr(self, "provider", MockEmailProvider()))


async def _reset_db():
    async with test_engine.begin() as conn:
        await conn.run_sync(lambda sync_conn: Base.metadata.create_all(sync_conn, checkfirst=True))
        await conn.run_sync(_auto_migrate_sqlite)
        for table in reversed(Base.metadata.sorted_tables):
            try:
                await conn.execute(text(f"DELETE FROM {table.name}"))
            except Exception:
                pass


async def override_get_db():
    async with TestSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture
def run_async():
    """Helper to run async coroutines in tests."""
    def _runner(coro):
        loop = asyncio.new_event_loop()
        try:
            asyncio.set_event_loop(loop)
            loop.run_until_complete(_reset_db())
            return loop.run_until_complete(coro)
        finally:
            loop.close()
    return _runner


@pytest.fixture
def test_db_session():
    """Get active TestSessionLocal context manager."""
    return TestSessionLocal


@pytest.fixture
def auth_headers():
    """Generate user identification header for testing (no JWT)."""
    return {"X-User-Id": "test-user-id", "Authorization": "Bearer test-user-id"}
