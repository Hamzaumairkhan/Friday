"""Trip service orchestrating trip lifecycle and state synchronization with DB."""

from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.trip import Trip, TripMember, TripStatus, MemberRole
from app.models.itinerary import Itinerary, Day, Activity
from app.models.budget import Budget
from app.schemas.trip import TripCreate, TripUpdate, TripState, ReplanResponse
from app.repositories.trip_repository import TripRepository
from app.services.budget_service import BudgetService
from app.services.itinerary_service import ItineraryService
from app.services.research_service import ResearchService
from app.core.exceptions import NotFoundError, AuthorizationError
from app.core.logging import get_logger

logger = get_logger("services.trip")


class TripService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = TripRepository(db)

    async def create_trip(self, user_id: str, data: TripCreate) -> Trip:
        # If budget per person is provided but total isn't (or vice versa)
        budget_total = data.budget_total
        budget_pp = data.budget_per_person
        if budget_pp and not budget_total:
            budget_total = budget_pp * data.travelers
        elif budget_total and not budget_pp:
            budget_pp = budget_total / data.travelers

        title = data.title or (f"{data.duration}-Day Trip to {data.destination}" if data.destination and data.duration else "New Adventure")

        trip = Trip(
            owner_id=user_id,
            title=title,
            destination=data.destination,
            origin=data.origin,
            duration=data.duration,
            travelers=data.travelers,
            budget_total=budget_total,
            budget_per_person=budget_pp,
            start_date=data.start_date,
            end_date=data.end_date,
            status=TripStatus.PLANNING,
            preferences=data.preferences,
            constraints=data.constraints,
            version=1,
        )
        trip = await self.repo.create(trip)

        # Add creator as owner member
        owner_member = TripMember(
            trip_id=trip.id,
            user_id=user_id,
            role=MemberRole.OWNER,
            invitation_status="ACCEPTED",
        )
        await self.repo.add_member(owner_member)

        # If destination and duration exist, automatically generate structured baseline itinerary & budget
        if trip.destination and trip.duration:
            research = await ResearchService.gather_destination_research(trip.destination, trip.origin)
            itin_data = ItineraryService.generate_default_itinerary(
                trip_id=trip.id,
                destination=trip.destination,
                duration=trip.duration,
                places=research["attractions"],
                hotels=research["hotels"],
                version=1,
            )
            itinerary = Itinerary(trip_id=trip.id, version=1, notes=itin_data.get("notes"))
            for d in itin_data.get("days", []):
                day_model = Day(
                    day_number=d["day_number"],
                    title=d.get("title"),
                    summary=d.get("summary"),
                )
                for act in d.get("activities", []):
                    activity_model = Activity(
                        order=act.get("order", 0),
                        title=act["title"],
                        description=act.get("description"),
                        location=act.get("location"),
                        start_time=act.get("start_time"),
                        end_time=act.get("end_time"),
                        duration_minutes=act.get("duration_minutes"),
                        estimated_cost=act.get("estimated_cost", 0.0),
                        category=act.get("category", "OTHER"),
                        confidence=act.get("confidence", 0.8),
                        notes=act.get("notes"),
                    )
                    day_model.activities.append(activity_model)
                itinerary.days.append(day_model)
            await self.repo.save_itinerary(itinerary)

            # Generate initial budget breakdown
            breakdown = BudgetService.estimate_budget_breakdown(
                destination=trip.destination,
                duration_days=trip.duration,
                travelers=trip.travelers,
                target_budget_total=trip.budget_total,
            )
            for item in breakdown:
                b = Budget(
                    trip_id=trip.id,
                    category=item["category"],
                    estimated_amount=item["estimated_amount"],
                    actual_amount=item.get("actual_amount", 0.0),
                    notes=item.get("notes"),
                    version="1",
                )
                await self.repo.save_budget(b)

        await self.db.commit()
        return await self.repo.get_by_id(trip.id)

    async def get_trip(self, trip_id: str, user_id: str) -> Trip:
        trip = await self.repo.get_by_id(trip_id)
        if not trip:
            raise NotFoundError("Trip", trip_id)
        is_member = await self.repo.is_trip_member(trip_id, user_id)
        if not is_member:
            raise AuthorizationError("Access denied to this trip")
        return trip

    async def list_user_trips(self, user_id: str) -> List[Trip]:
        return await self.repo.get_user_trips(user_id)

    async def update_trip(self, trip_id: str, user_id: str, data: TripUpdate) -> Trip:
        trip = await self.get_trip(trip_id, user_id)
        update_data = data.model_dump(exclude_unset=True)

        for key, value in update_data.items():
            if hasattr(trip, key):
                setattr(trip, key, value)

        # Update budget calculations if changed
        if "budget_per_person" in update_data and "budget_total" not in update_data:
            trip.budget_total = (trip.budget_per_person or 0) * trip.travelers
        elif "budget_total" in update_data and "budget_per_person" not in update_data:
            trip.budget_per_person = (trip.budget_total or 0) / max(1, trip.travelers)

        trip.version += 1
        await self.repo.update(trip)
        await self.db.commit()
        return trip

    async def add_member(self, trip_id: str, current_user_id: str, new_user_id: str, role: str = "MEMBER") -> TripMember:
        trip = await self.get_trip(trip_id, current_user_id)
        is_owner = await self.repo.is_trip_owner(trip_id, current_user_id)
        if not is_owner:
            raise AuthorizationError("Only the trip owner can add members")

        member = TripMember(
            trip_id=trip_id,
            user_id=new_user_id,
            role=MemberRole.MEMBER if role.upper() != "OWNER" else MemberRole.OWNER,
            invitation_status="ACCEPTED",
        )
        saved = await self.repo.add_member(member)
        await self.db.commit()
        return saved

    async def to_trip_state(self, trip: Trip) -> TripState:
        """Convert database Trip model into the Pydantic TripState used by AI agents."""
        itinerary_dict = None
        if trip.itinerary:
            itinerary_dict = {
                "id": trip.itinerary.id,
                "version": trip.itinerary.version,
                "notes": trip.itinerary.notes,
                "days": [
                    {
                        "id": d.id,
                        "day_number": d.day_number,
                        "title": d.title,
                        "summary": d.summary,
                        "activities": [
                            {
                                "id": a.id,
                                "order": a.order,
                                "title": a.title,
                                "description": a.description,
                                "location": a.location,
                                "start_time": a.start_time,
                                "end_time": a.end_time,
                                "duration_minutes": a.duration_minutes,
                                "estimated_cost": a.estimated_cost,
                                "category": a.category.value if hasattr(a.category, 'value') else a.category,
                                "confidence": a.confidence,
                                "notes": a.notes,
                            }
                            for a in d.activities
                        ],
                    }
                    for d in trip.itinerary.days
                ],
            }

        budget_items = [
            {
                "category": b.category.value if hasattr(b.category, 'value') else b.category,
                "estimated_amount": b.estimated_amount,
                "actual_amount": b.actual_amount,
                "notes": b.notes,
            }
            for b in trip.budgets
        ]
        budget_summary = BudgetService.calculate_summary(
            trip_id=trip.id,
            total_budget_limit=trip.budget_total,
            budget_items=budget_items,
            travelers=trip.travelers,
        )

        return TripState(
            trip_id=trip.id,
            destination=trip.destination,
            origin=trip.origin,
            duration=trip.duration,
            travelers=trip.travelers,
            budget_total=trip.budget_total,
            budget_per_person=trip.budget_per_person,
            preferences=trip.preferences or [],
            constraints=trip.constraints or [],
            itinerary=itinerary_dict,
            budget_breakdown=budget_summary.model_dump(),
            version=trip.version,
        )
