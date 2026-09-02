"""Database engine and session management with SQLite schema auto-migration."""

import os
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy import create_engine, inspect, text
from app.core.config import get_settings
from app.database.base import Base

settings = get_settings()


def _ensure_sqlite_dir(url: str):
    """Ensure the directory for a sqlite database file exists."""
    if "sqlite" in url and ":///" in url:
        path = url.split(":///")[-1]
        if path and path != ":memory:":
            dirname = os.path.dirname(os.path.abspath(path))
            if dirname:
                os.makedirs(dirname, exist_ok=True)


def _normalize_async_db_url(url: str) -> str:
    """Normalize database URL for SQLAlchemy async engine (e.g. Railway mysql:// -> mysql+asyncmy://)."""
    if url.startswith("mysql://"):
        return url.replace("mysql://", "mysql+asyncmy://", 1)
    return url


def _normalize_sync_db_url(url: str) -> str:
    """Normalize database URL for SQLAlchemy sync engine (e.g. Railway mysql:// -> mysql+pymysql://)."""
    if url.startswith("mysql://"):
        return url.replace("mysql://", "mysql+pymysql://", 1)
    return url


_async_db_url = _normalize_async_db_url(settings.DATABASE_URL)
_sync_db_url = _normalize_sync_db_url(settings.DATABASE_SYNC_URL)

_ensure_sqlite_dir(_async_db_url)
_ensure_sqlite_dir(_sync_db_url)


def _get_engine_kwargs(url: str) -> dict:
    """Build production connection pool parameters with automatic health pinging."""
    kwargs = {
        "echo": False,
        "future": True,
        "pool_pre_ping": getattr(settings, "DB_POOL_PRE_PING", True),
    }
    if "sqlite" not in url.lower():
        kwargs.update({
            "pool_size": getattr(settings, "DB_POOL_SIZE", 10),
            "max_overflow": getattr(settings, "DB_MAX_OVERFLOW", 10),
            "pool_timeout": getattr(settings, "DB_POOL_TIMEOUT", 30.0),
            "pool_recycle": getattr(settings, "DB_POOL_RECYCLE", 1800),
        })
    return kwargs


# Async engine for FastAPI
async_engine = create_async_engine(
    _async_db_url,
    **_get_engine_kwargs(_async_db_url),
)

# Sync engine for migrations, seed scripts, and testing
sync_engine = create_engine(
    _sync_db_url,
    **_get_engine_kwargs(_sync_db_url),
)

async_session_factory = async_sessionmaker(
    async_engine, class_=AsyncSession, expire_on_commit=False
)


def _auto_migrate_schema(sync_conn):
    """Check for missing columns on existing tables (SQLite/MySQL) and add them dynamically."""
    inspector = inspect(sync_conn)
    for table in Base.metadata.tables.values():
        if inspector.has_table(table.name):
            try:
                existing_columns = {col["name"] for col in inspector.get_columns(table.name)}
                for column in table.columns:
                    if column.name not in existing_columns:
                        col_type = column.type.compile(sync_conn.dialect)
                        try:
                            sync_conn.execute(text(f"ALTER TABLE `{table.name}` ADD COLUMN `{column.name}` {col_type} NULL"))
                        except Exception:
                            try:
                                sync_conn.execute(text(f"ALTER TABLE {table.name} ADD COLUMN {column.name} {col_type}"))
                            except Exception:
                                pass
                    elif column.name == "image_url":
                        try:
                            sync_conn.execute(text(f"ALTER TABLE `{table.name}` MODIFY COLUMN `image_url` TEXT NULL"))
                        except Exception:
                            pass
            except Exception:
                pass


async def get_db() -> AsyncSession:
    """FastAPI dependency that provides a database session."""
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db() -> None:
    """Create all tables and auto-migrate missing columns with production MySQL validation."""
    if settings.is_production and "sqlite" in settings.DATABASE_URL.lower():
        raise RuntimeError(
            "Production deployment error: DATABASE_URL must be configured with a managed MySQL connection (e.g. mysql+asyncmy://user:pass@host:port/dbname). SQLite is strictly prohibited in production mode."
        )
    _ensure_sqlite_dir(settings.DATABASE_URL)
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.run_sync(_auto_migrate_schema)


def init_db_sync() -> None:
    """Create all tables synchronously (for scripts) and auto-migrate."""
    _ensure_sqlite_dir(settings.DATABASE_SYNC_URL)
    Base.metadata.create_all(bind=sync_engine)
    with sync_engine.begin() as conn:
        _auto_migrate_schema(conn)

