"""Database seed utility for default local organizers, packages, and test users with 100% idempotent upsert."""

from typing import Optional, Dict, Any, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.database import async_session_factory
from app.models.user import User, UserRole
from app.models.organizer import Organizer
from app.models.package import Package
from app.core.logging import get_logger

logger = get_logger("database.seed")

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
        "description": "Pioneering local travel organizer based in Karimabad with 15+ years experience.",
        "contact_email": "info@hunzaexplorers.pk",
        "contact_phone": "+92-300-1234567",
        "verification_status": "PLATFORM_CURATED",
        "is_verified": True,
        "destinations": ["Hunza", "Skardu", "Fairy Meadows", "Gilgit"],
        "rating": 4.9,
        "reviews_count": 128,
        "location": "Karimabad, Hunza",
        "website": "https://hunzaexplorers.pk",
        "onboarding_completed": True,
        "number_of_buses": 5,
        "vehicle_capacity": 20,
        "maximum_group_size": 25,
        "experience_years": 15,
        "payment_account_title": "Hunza Explorers & Treks",
        "payment_account_number": "PK36MEZN0099120100123456",
        "payment_bank_name": "Meezan Bank",
        "payment_instructions": "Transfer via bank or JazzCash to the above account. Send screenshot after payment.",
    },
    {
        "id": "org-karakoram-journeys",
        "name": "Karakoram Journeys Pakistan",
        "description": "Certified adventure travel group offering budget and premium customized tours across North Pakistan.",
        "contact_email": "bookings@karakoramjourneys.com",
        "contact_phone": "+92-312-9876543",
        "verification_status": "PLATFORM_CURATED",
        "is_verified": True,
        "destinations": ["Hunza", "Skardu", "Swat", "Naran", "Kumrat"],
        "rating": 4.8,
        "reviews_count": 94,
        "location": "Islamabad / Skardu",
        "website": "https://karakoramjourneys.com",
        "onboarding_completed": True,
        "number_of_buses": 8,
        "vehicle_capacity": 15,
        "maximum_group_size": 20,
        "experience_years": 10,
        "payment_account_title": "Karakoram Journeys",
        "payment_account_number": "PK50ALFH0943001007654321",
        "payment_bank_name": "Bank Alfalah",
        "payment_instructions": "Bank transfer or EasyPaisa accepted. Reference your booking ID.",
    },
    {
        "id": "org-swat-tours",
        "name": "Swat Valley Heritage Tours",
        "description": "Specialists in Swat, Kalam, and Malam Jabba trips with family-friendly itineraries.",
        "contact_email": "hello@swattours.pk",
        "contact_phone": "+92-333-5551234",
        "verification_status": "PLATFORM_CURATED",
        "is_verified": True,
        "destinations": ["Swat", "Kalam", "Malam Jabba", "Kumrat"],
        "rating": 4.7,
        "reviews_count": 62,
        "location": "Mingora, Swat",
        "website": "https://swattours.pk",
        "onboarding_completed": True,
        "number_of_buses": 3,
        "vehicle_capacity": 16,
        "maximum_group_size": 16,
        "experience_years": 8,
        "payment_account_title": "Swat Valley Heritage Tours",
        "payment_account_number": "PK22HBL0012345678901234",
        "payment_bank_name": "HBL",
        "payment_instructions": "Transfer to HBL account. WhatsApp screenshot to +92-333-5551234.",
    },
]

DEMO_PACKAGES: List[Dict[str, Any]] = [
    {
        "id": "pkg-hunza-4d",
        "organizer_id": "org-hunza-explorers",
        "title": "Hunza Highlights 4-Day Adventure",
        "destination": "Hunza",
        "duration_days": 4,
        "price_per_person": 38000.0,
        "max_travelers": 15,
        "description": "Complete 4-day guided tour covering Attabad Lake, Baltit Fort, Eagle's Nest, and Passu.",
        "inclusions": ["Transport (Saloon Coaster/Hiace)", "3-Star Hotel Stays", "Breakfast & Dinner", "Attabad Boating Fee", "Local Guide"],
        "exclusions": ["Lunch", "Personal shopping", "Fort Entry tickets"],
        "accommodation_type": "Standard 3-Star Hotel",
        "transportation_type": "Private AC Vehicle / 4x4",
        "activities": ["Attabad Lake", "Baltit Fort", "Eagle's Nest", "Passu Cones", "Hussaini Bridge", "Khunjerab Pass"],
        "is_active": True,
        "image_url": "/images/stitch/stitch_asset_1.jpg",
    },
    {
        "id": "pkg-hunza-budget-5d",
        "organizer_id": "org-karakoram-journeys",
        "title": "Hunza & Nagar Budget Escapade 5D",
        "destination": "Hunza",
        "duration_days": 5,
        "price_per_person": 32000.0,
        "max_travelers": 20,
        "description": "Budget-friendly group escapade to Hunza Valley with scenic stops.",
        "inclusions": ["Coaster transport", "Shared accommodation", "2 meals daily", "First aid & guide"],
        "exclusions": ["Personal shopping", "Lunch"],
        "accommodation_type": "Standard Guest House",
        "transportation_type": "Grand Cabin / Coaster",
        "activities": ["Rakaposhi Viewpoint", "Karimabad Market", "Attabad Lake", "Passu Cones", "Altit Fort"],
        "is_active": True,
        "image_url": "/images/stitch/stitch_asset_6.jpg",
    },
    {
        "id": "pkg-skardu-6d",
        "organizer_id": "org-karakoram-journeys",
        "title": "Skardu & Deosai Explorer 6D",
        "destination": "Skardu",
        "duration_days": 6,
        "price_per_person": 45000.0,
        "max_travelers": 12,
        "description": "Explore Shangrila, Upper Kachura, and the majestic Deosai National Park.",
        "inclusions": ["4x4 Jeeps in Skardu", "Hotel stay", "Breakfast & Dinner", "Deosai Entry Fee"],
        "exclusions": ["Airfare", "Lunch"],
        "accommodation_type": "Hotel One / Equivalent",
        "transportation_type": "4x4 Prado/Revo & Coaster",
        "activities": ["Shangrila Lake", "Upper Kachura", "Deosai Plains", "Satpara Lake", "Cold Desert"],
        "is_active": True,
        "image_url": "/images/stitch/stitch_asset_14.jpg",
    },
    {
        "id": "pkg-swat-3d",
        "organizer_id": "org-swat-tours",
        "title": "Swat & Malam Jabba Weekend Escape 3D",
        "destination": "Swat",
        "duration_days": 3,
        "price_per_person": 22000.0,
        "max_travelers": 16,
        "description": "Quick 3-day getaway to Swat Valley, Fizagat, and the Malam Jabba chairlift.",
        "inclusions": ["Dedicated transport", "Hotel with breakfast", "Malam Jabba chairlift assistance"],
        "exclusions": ["Personal gear", "Food other than breakfast"],
        "accommodation_type": "Fizagat Riverside Resort",
        "transportation_type": "AC Hiace",
        "activities": ["White Palace", "Malam Jabba", "Fizagat", "Swat Museum"],
        "is_active": True,
        "image_url": "/images/stitch/stitch_asset_9.jpg",
    },
]


async def seed_initial_data_async(session: Optional[AsyncSession] = None):
    """Seed initial demo users, organizers, and packages safely and idempotently."""
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
    logger.info("Successfully synced and verified initial seed data (idempotent).")
