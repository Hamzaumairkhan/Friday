import asyncio
import sys
import os

# Add backend directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database.database import async_session_factory
from app.models.trip import Trip
from app.models.user import User
from app.models.itinerary import Itinerary, Day, Activity
from app.services.dynamic_research_service import DynamicDestinationResearchService
from sqlalchemy import select

async def test_db_persistence():
    dest = "Shounter Pass"
    origin = "Islamabad"
    print(f"Testing full dynamic generation and DB persistence for: '{dest}'")

    days_data, hero_img = await DynamicDestinationResearchService.generate_dynamic_itinerary_days(
        destination=dest,
        origin=origin,
        duration_days=3,
        budget_total=45000,
        accommodation_preference="comfortable"
    )

    async with async_session_factory() as session:
        # Get existing user
        result = await session.execute(select(User))
        user = result.scalars().first()
        if not user:
            user = User(email="test@friday.ai", name="Test Traveler", role="TRAVELER")
            session.add(user)
            await session.flush()

        # Create Trip
        trip = Trip(
            title=f"{dest}, at your pace",
            destination=dest,
            origin=origin,
            duration=3,
            travelers=2,
            budget_total=45000,
            image_url=hero_img,
            status="DRAFT",
            is_public=0,
            owner_id=user.id
        )
        session.add(trip)
        await session.flush()

        # Create Itinerary
        itin = Itinerary(trip_id=trip.id)
        session.add(itin)
        await session.flush()

        # Add Days & Activities
        total_acts = 0
        for d in days_data:
            day_obj = Day(
                itinerary_id=itin.id,
                day_number=d["day_number"],
                title=d["title"],
                summary=d.get("summary")
            )
            session.add(day_obj)
            await session.flush()

            for act in d["activities"]:
                act_obj = Activity(
                    day_id=day_obj.id,
                    order=act.get("order", 1),
                    title=act["title"],
                    description=act.get("description"),
                    category=act.get("category", "SIGHTSEEING"),
                    start_time=act.get("start_time"),
                    end_time=act.get("end_time"),
                    duration_minutes=act.get("duration_minutes", 60),
                    estimated_cost=act.get("estimated_cost", 0),
                    location=act.get("location"),
                    image_url=act.get("image_url"),
                    notes=act.get("map_url")  # verified maps url
                )
                session.add(act_obj)
                total_acts += 1

        await session.commit()
        print(f"[SUCCESS] Trip '{trip.id}' persisted to MySQL database with {len(days_data)} days and {total_acts} activities!")
        print(f"[VERIFY] Hero Image persisted: {trip.image_url}")

if __name__ == "__main__":
    asyncio.run(test_db_persistence())
