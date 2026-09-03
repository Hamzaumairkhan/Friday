"""Database seed utility for default local organizers, packages, and test users with 100% idempotent upsert."""

from typing import Optional, Dict, Any, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import get_settings
from app.database.database import async_session_factory
from app.models.user import User, UserRole
from app.models.organizer import Organizer
from app.models.package import Package
from app.core.logging import get_logger

logger = get_logger("database.seed")
settings = get_settings()

DEMO_USERS: List[Dict[str, Any]] = [
    {
        "id": "user-demo-1",
        "email": "traveler@friday.pk",
        "name": "Ali Khan",
        "role": UserRole.TRAVELER,
        "is_active": True,
    }
]

DEMO_ORGANIZERS: List[Dict[str, Any]] = [
    {
        "id": "org-hunza-explorers",
        "name": "Hunza Explorers & Treks",
        "description": "Licensed northern Pakistan mountain expedition host.",
        "contact_email": "hunza@friday.pk",
        "contact_phone": "+923001234567",
        "verification_status": "VERIFIED",
        "is_verified": True,
        "destinations": ["Hunza", "Gilgit", "Skardu"],
        "rating": 0.0,
        "reviews_count": 0,
        "location": "Karimabad, Hunza",
    }
]

DEMO_PACKAGES: List[Dict[str, Any]] = [
    {
        "id": "pkg-hunza-5d",
        "organizer_id": "org-hunza-explorers",
        "title": "Hunza Valley Autumn Discovery",
        "destination": "Hunza",
        "duration_days": 5,
        "price_per_person": 45000.0,
        "max_travelers": 20,
        "description": "5-day guided autumn expedition across Karimabad, Attabad Lake, and Passu Cones.",
        "inclusions": ["Transport", "Lodging", "Breakfast & Dinner", "Guide"],
        "exclusions": ["Personal gear", "Tips"],
        "accommodation_type": "Heritage Lodge",
        "transportation_type": "AC Coaster",
        "activities": ["Baltit Fort Tour", "Attabad Boating", "Passu Cones Hike"],
        "is_active": True,
    }
]


async def seed_initial_data_async(session: Optional[AsyncSession] = None):
    """Seed initial demo users, organizers, and packages safely and idempotently (isolated from production)."""
    if getattr(settings, "ENVIRONMENT", "development").lower() == "production":
        logger.info("Production environment detected — skipping demo seed data population.")
        return

    if session is not None:
        await _seed_with_session(session)
    else:
        async with async_session_factory() as db:
            await _seed_with_session(db)


async def _seed_with_session(db: AsyncSession):
    # 1. Idempotent User Seeding
    for user_data in DEMO_USERS:
        existing = await db.get(User, user_data["id"])
        if not existing:
            db.add(User(**user_data))
        else:
            for k, v in user_data.items():
                setattr(existing, k, v)

    # 2. Idempotent Organizer Seeding
    for org_data in DEMO_ORGANIZERS:
        existing_org = await db.get(Organizer, org_data["id"])
        if not existing_org:
            db.add(Organizer(**org_data))
        else:
            for k, v in org_data.items():
                setattr(existing_org, k, v)

    await db.flush()

    # 3. Idempotent Package Seeding
    for pkg_data in DEMO_PACKAGES:
        existing_pkg = await db.get(Package, pkg_data["id"])
        if not existing_pkg:
            db.add(Package(**pkg_data))
        else:
            for k, v in pkg_data.items():
                setattr(existing_pkg, k, v)

    await db.commit()
    logger.info("Successfully synced initial test/development seed data (idempotent).")
