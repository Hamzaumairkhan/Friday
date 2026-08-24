"""Marketplace Agent — matches travelers with verified local organizers and packages."""

from typing import Dict, Any, List
from app.services.marketplace_service import MarketplaceService
from app.schemas.organizer import OrganizerMatchRequest
from app.core.logging import get_logger

logger = get_logger("agents.marketplace")


class MarketplaceAgent:
    """Finds trusted tour operators matching trip specifications."""

    @classmethod
    async def run(
        cls,
        marketplace_service: MarketplaceService,
        destination: str,
        budget_per_person: float | None = None,
        duration: int | None = None,
        travelers: int = 1,
    ) -> List[Dict[str, Any]]:
        logger.info(f"Marketplace agent finding organizers for {destination}")
        req = OrganizerMatchRequest(
            destination=destination,
            budget_per_person=budget_per_person,
            duration=duration,
            travelers=travelers,
        )
        matches = await marketplace_service.match_organizers(req)
        return [m.model_dump() for m in matches]
