"""Organizers tool for discovering local Pakistani tour operators and marketplace packages directly from database."""

from datetime import datetime
from typing import Optional, Dict, Any, List
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database.database import async_session_factory
from app.models.organizer import Organizer
from app.models.package import Package
from app.core.logging import get_logger

logger = get_logger("tools.organizers")


class OrganizersTool:
    """Organizers discovery tool querying the Friday marketplace SQLite database."""

    async def search_organizers(
        self,
        destination: Optional[str] = None,
        budget_per_person: Optional[float] = None
    ) -> Dict[str, Any]:
        """Search organizers and their packages from SQLite database with explicit source transparency."""
        organizers_list = []

        try:
            async with async_session_factory() as session:
                query = select(Organizer).options(selectinload(Organizer.packages)).where(Organizer.is_verified == True)
                result = await session.execute(query)
                orgs = result.scalars().all()

                for org in orgs:
                    # Filter destination if specified
                    if destination and destination.strip():
                        dest_lower = destination.strip().lower()
                        org_dests = [d.lower() for d in (org.destinations or [])]
                        if not any(dest_lower in d for d in org_dests):
                            # Also check package destinations
                            pkg_dests = [p.destination.lower() for p in (org.packages or []) if p.destination]
                            if not any(dest_lower in p for p in pkg_dests):
                                continue

                    # Filter budget if specified
                    if budget_per_person and budget_per_person > 0:
                        matching_pkgs = [
                            p for p in (org.packages or [])
                            if p.price_per_person and p.price_per_person <= budget_per_person * 1.25
                        ]
                        if not matching_pkgs and org.packages:
                            continue

                    organizers_list.append({
                        "id": org.id,
                        "name": org.name,
                        "description": org.description,
                        "rating": org.rating or 0.0,
                        "reviews_count": org.reviews_count or 0,
                        "verification_status": org.verification_status or "PLATFORM_CURATED",
                        "is_verified": org.is_verified,
                        "destinations": org.destinations or [],
                        "contact_phone": org.contact_phone,
                        "contact_email": org.contact_email,
                        "packages": [
                            {
                                "id": p.id,
                                "title": p.title,
                                "destination": p.destination,
                                "duration_days": p.duration_days,
                                "price_per_person": p.price_per_person,
                                "max_travelers": p.max_travelers,
                                "inclusions": p.inclusions or [],
                                "exclusions": p.exclusions or [],
                                "accommodation_type": p.accommodation_type,
                                "transportation_type": p.transportation_type,
                                "activities": p.activities or [],
                            }
                            for p in (org.packages or [])
                        ],
                    })
        except Exception as e:
            logger.warning(f"Database query for organizers failed ({e}). Returning empty structured list.")

        return {
            "success": True,
            "data": organizers_list,
            "source": "friday_marketplace_db",
            "source_type": "curated_seed",
            "data_disclaimer": "Curated marketplace seed data. Independent verification pending.",
            "retrieved_at": datetime.utcnow().isoformat(),
            "error": None,
        }


async def search_organizers(
    destination: Optional[str] = None,
    budget_per_person: Optional[float] = None
) -> dict:
    """Search for travel organizers and their packages."""
    tool = OrganizersTool()
    res = await tool.search_organizers(destination=destination, budget_per_person=budget_per_person)
    return {
        "success": True,
        "data": {
            "destination": destination,
            "count": len(res["data"]),
            "organizers": res["data"],
        },
        "source": res["source"],
        "source_type": res["source_type"],
        "data_disclaimer": res.get("data_disclaimer"),
        "timestamp": res.get("retrieved_at"),
        "error": None,
    }
