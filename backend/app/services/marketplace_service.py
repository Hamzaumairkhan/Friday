"""Marketplace service for ranking, listing, and matching verified tour operators and packages."""

from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.organizer import Organizer
from app.models.package import Package
from app.schemas.organizer import OrganizerMatchRequest, OrganizerMatchResult, OrganizerResponse
from app.repositories.organizer_repository import OrganizerRepository
from app.repositories.package_repository import PackageRepository
from app.core.exceptions import NotFoundError
from app.core.logging import get_logger

logger = get_logger("services.marketplace")


class MarketplaceService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = OrganizerRepository(db)
        self.package_repo = PackageRepository(db)

    async def list_organizers(
        self,
        destination: Optional[str] = None,
        is_verified: Optional[bool] = None,
    ) -> List[Organizer]:
        return await self.repo.list_all(destination=destination, is_verified=is_verified)

    async def get_organizer(self, organizer_id: str) -> Organizer:
        org = await self.repo.get_by_id(organizer_id)
        if not org:
            raise NotFoundError(f"Organizer '{organizer_id}' not found")
        return org

    async def list_packages(
        self,
        destination: Optional[str] = None,
        organizer_id: Optional[str] = None,
        max_price: Optional[float] = None,
        max_duration: Optional[int] = None,
    ) -> List[Package]:
        return await self.package_repo.list_all(
            destination=destination,
            organizer_id=organizer_id,
            max_price=max_price,
            max_duration=max_duration,
        )

    async def get_package(self, package_id: str) -> Package:
        pkg = await self.package_repo.get_by_id(package_id)
        if not pkg:
            raise NotFoundError(f"Package '{package_id}' not found")
        return pkg

    async def match_organizers(self, req: OrganizerMatchRequest) -> List[OrganizerMatchResult]:
        """Match organizers for an OrganizerMatchRequest schema."""
        raw_matches = await self.match_organizers_for_trip(
            destination=req.destination or "Hunza",
            budget_per_person=req.budget_per_person or 40000.0,
            duration=req.duration or 4,
            travelers=req.travelers or 2,
        )

        results = []
        for m in raw_matches:
            org_data = m["organizer"]
            org_resp = OrganizerResponse(
                id=org_data["id"],
                name=org_data["name"],
                description=org_data.get("description"),
                verification_status=org_data.get("verification_status", "VERIFIED"),
                is_verified=org_data.get("is_verified", True),
                destinations=org_data.get("destinations", []),
                rating=org_data.get("rating", 0.0),
                reviews_count=org_data.get("reviews_count", 0),
                location=org_data.get("location"),
                website=org_data.get("website"),
            )
            matching_pkgs = [m["recommended_package"]] if m.get("recommended_package") else []
            results.append(OrganizerMatchResult(
                organizer=org_resp,
                match_score=m["match_score"],
                reasons=m["reasons"],
                matching_packages=matching_pkgs,
            ))
        return results

    async def match_organizers_for_trip(
        self,
        destination: str,
        budget_per_person: float,
        duration: int = 4,
        travelers: int = 2,
    ) -> List[Dict[str, Any]]:
        """Transparent multi-factor ranking algorithm for local tour operators."""
        result = await self.db.execute(
            select(Organizer).options(selectinload(Organizer.packages)).where(Organizer.is_verified == True)
        )
        all_orgs = result.scalars().all()

        scored_results = []
        for org in all_orgs:
            score = 0.0
            reasons = []

            # 1. Destination Match (Weight: 35%)
            dest_lower = destination.lower()
            org_destinations = [d.lower() for d in (org.destinations or [])]
            if dest_lower in org_destinations:
                score += 0.35
                reasons.append(f"Official operator presence in {destination}")
            elif any(d in dest_lower for d in org_destinations):
                score += 0.20
                reasons.append(f"Regional coverage for {destination}")

            # 2. Package Compatibility & Budget Matching (Weight: 30%)
            best_pkg = None
            pkg_price_diff = float("inf")
            for pkg in org.packages:
                if not pkg.is_active:
                    continue
                if pkg.destination.lower() == dest_lower:
                    diff = abs(pkg.price_per_person - budget_per_person)
                    if diff < pkg_price_diff:
                        pkg_price_diff = diff
                        best_pkg = pkg

            if best_pkg:
                if best_pkg.price_per_person <= budget_per_person * 1.15:
                    score += 0.30
                    reasons.append(f"Budget compatible package available (Rs. {best_pkg.price_per_person:,.0f}/person)")
                else:
                    score += 0.15
                    reasons.append(f"Premium package available (Rs. {best_pkg.price_per_person:,.0f}/person)")

                # Duration Match (Weight: 15%)
                if abs(best_pkg.duration_days - duration) <= 1:
                    score += 0.15
                    reasons.append(f"Matches duration ({best_pkg.duration_days} days)")
            else:
                score += 0.10

            # 3. Verification & Operator Rating (Weight: 20%)
            if org.is_verified:
                score += 0.10
                reasons.append("Verified and background-checked operator")

            rating_points = min((org.rating / 5.0) * 0.10, 0.10) if org.rating else 0.05
            score += rating_points
            if org.rating and org.rating >= 4.5:
                reasons.append(f"Top-rated ({org.rating}/5.0 based on {org.reviews_count} reviews)")

            final_score = round(min(score, 1.0), 2)

            scored_results.append({
                "organizer": {
                    "id": org.id,
                    "name": org.name,
                    "description": org.description,
                    "verification_status": org.verification_status,
                    "is_verified": org.is_verified,
                    "destinations": org.destinations or [],
                    "rating": org.rating,
                    "reviews_count": org.reviews_count,
                    "location": org.location,
                    "website": org.website,
                    "contact_email": org.contact_email,
                    "contact_phone": org.contact_phone,
                },
                "match_score": final_score,
                "reasons": reasons,
                "recommended_package": {
                    "id": best_pkg.id,
                    "title": best_pkg.title,
                    "price_per_person": best_pkg.price_per_person,
                    "duration_days": best_pkg.duration_days,
                } if best_pkg else None,
            })

        # Sort descending by match score
        scored_results.sort(key=lambda x: x["match_score"], reverse=True)
        return scored_results
