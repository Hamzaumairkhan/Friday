"""Packages API endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from pydantic import BaseModel

from app.database.database import get_db
from app.models.package import Package, PackageView
from app.services.marketplace_service import MarketplaceService
from app.llm.router import get_llm_router
from app.llm.base import TaskType
from app.core.logging import get_logger

logger = get_logger("api.packages")
router = APIRouter(prefix="/packages", tags=["Packages"])


class GenerateDescriptionRequest(BaseModel):
    title: Optional[str] = ""
    destination: Optional[str] = ""
    duration_days: Optional[int] = 3


@router.post("/generate-description")
async def generate_package_description(req: GenerateDescriptionRequest):
    """Generate an engaging, evocative 1-paragraph expedition narrative using Friday AI."""
    title = (req.title or "").strip()
    dest = (req.destination or "").strip()
    days = req.duration_days or 3

    if not title and not dest:
        raise HTTPException(status_code=400, detail="Please provide at least a title or destination.")

    prompt = f"""Write an engaging, evocative, and high-converting single-paragraph expedition overview (approx 3-5 sentences) for a Pakistan adventure tour package.

Tour Details:
- Title: {title or 'Uncharted Expedition'}
- Destination: {dest or 'Northern Pakistan'}
- Duration: {days} Days

Requirements:
- Highlight the breathtaking scenic beauty, key cultural or landscape highlights of {dest or title}, and the unforgettable journey experience.
- Tone: Adventurous, premium, authentic, and inspiring.
- Do NOT use bullet points, headings, or quotes. Output only the single paragraph text.
"""
    try:
        llm_router = get_llm_router()
        res = await llm_router.generate_text(
            task=TaskType.GENERAL_CHAT,
            prompt=prompt,
            system_prompt="You are Friday's expert travel copywriter and Pakistan adventure specialist.",
            temperature=0.7,
            max_tokens=300,
        )
        description = res.content.strip().strip('"').strip("'")
        return {"description": description}
    except Exception as e:
        logger.warning(f"AI generation fallback triggered: {e}")
        dest_name = dest or title or "Northern Pakistan"
        fallback_desc = f"Embark on an unforgettable {days}-day expedition to {dest_name}. Experience majestic landscapes, serene valley panoramas, rich local heritage, and guided exploration designed for avid travelers seeking authentic mountain adventure."
        return {"description": fallback_desc}


class GenerateItineraryRequest(BaseModel):
    destination: str
    duration_days: Optional[int] = 3
    title: Optional[str] = ""
    accommodation_type: Optional[str] = "comfortable"


@router.post("/generate-itinerary")
async def generate_package_itinerary(req: GenerateItineraryRequest):
    """Generate complete Day-by-Day structured itinerary with hourly slots for an organizer package."""
    from app.services.dynamic_research_service import DynamicDestinationResearchService
    
    dest = (req.destination or "Hunza Valley").strip()
    days = max(1, min(req.duration_days or 3, 14))
    
    days_data, hero_img = await DynamicDestinationResearchService.generate_dynamic_itinerary_days(
        destination=dest,
        origin="Islamabad",
        duration_days=days,
        budget_total=45000.0 * days,
        accommodation_preference=req.accommodation_type or "comfortable",
    )
    return {
        "destination": dest,
        "duration_days": days,
        "days": days_data,
        "days_schedule": days_data,
        "hero_image": hero_img,
    }


def _sanitize_https(url: Optional[str]) -> Optional[str]:
    if not url or not isinstance(url, str):
        return url
    if url.startswith("http://"):
        return url.replace("http://", "https://", 1)
    return url


def _sanitize_activities_https(activities: list) -> list:
    if not activities or not isinstance(activities, list):
        return []
    clean_acts = []
    for item in activities:
        if isinstance(item, dict):
            item_copy = dict(item)
            if "image_url" in item_copy and item_copy["image_url"]:
                item_copy["image_url"] = _sanitize_https(item_copy["image_url"])
            if "activities" in item_copy and isinstance(item_copy["activities"], list):
                clean_nested = []
                for sub in item_copy["activities"]:
                    if isinstance(sub, dict):
                        sub_copy = dict(sub)
                        if "image_url" in sub_copy and sub_copy["image_url"]:
                            sub_copy["image_url"] = _sanitize_https(sub_copy["image_url"])
                        clean_nested.append(sub_copy)
                    else:
                        clean_nested.append(sub)
                item_copy["activities"] = clean_nested
            clean_acts.append(item_copy)
        else:
            clean_acts.append(item)
    return clean_acts


def _format_public_package(p) -> dict:
    org = getattr(p, 'organizer', None)
    org_name = (getattr(org, 'name', None) if org else None) or getattr(p, 'organizer_name', None) or "Verified Tour Host"
    org_phone = (getattr(org, 'contact_phone', None) if org else None) or getattr(p, 'contact_phone', None) or "+92 300 1234567"
    org_email = getattr(org, 'contact_email', None) if org else None
    pkg_rating = getattr(p, 'rating', 0.0) or 0.0
    pkg_reviews_count = getattr(p, 'reviews_count', 0) or 0
    return {
        "id": p.id,
        "organizer_id": p.organizer_id,
        "title": p.title,
        "destination": p.destination,
        "duration_days": p.duration_days,
        "price_per_person": p.price_per_person,
        "max_travelers": p.max_travelers,
        "description": p.description,
        "inclusions": p.inclusions or [],
        "exclusions": p.exclusions or [],
        "accommodation_type": p.accommodation_type,
        "transportation_type": p.transportation_type,
        "activities": _sanitize_activities_https(p.activities or []),
        "start_date": getattr(p, 'start_date', None),
        "end_date": getattr(p, 'end_date', None),
        "contact_phone": org_phone,
        "organizer_name": org_name,
        "contact_email": org_email,
        "rating": round(float(pkg_rating), 1),
        "reviews_count": int(pkg_reviews_count),
        "views_count": int(getattr(p, 'views_count', 0) or 0),
        "is_active": bool(getattr(p, 'is_active', True)),
        "image_url": _sanitize_https(p.image_url),
        "gallery_urls": [_sanitize_https(u) for u in (p.gallery_urls or [])],
        "created_at": p.created_at.isoformat() if hasattr(p, 'created_at') and p.created_at else None,
        "updated_at": p.updated_at.isoformat() if hasattr(p, 'updated_at') and p.updated_at else None,
    }


@router.get("")
async def list_packages(
    organizer_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    service = MarketplaceService(db)
    pkgs = await service.list_packages(organizer_id=organizer_id)
    return [_format_public_package(p) for p in pkgs]


@router.get("/{package_id}")
async def get_package(
    package_id: str,
    db: AsyncSession = Depends(get_db),
):
    service = MarketplaceService(db)
    p = await service.get_package(package_id)
    if not p:
        raise HTTPException(status_code=404, detail="Package not found")
    return _format_public_package(p)


@router.post("/{package_id}/view")
async def track_package_view(
    package_id: str,
    payload: Optional[dict] = Body(default={}),
    db: AsyncSession = Depends(get_db),
):
    """Record a single unique view per visitor/user. Repeated requests by the same visitor will NOT increment views."""
    visitor_id = ((payload or {}).get("visitor_id") or "").strip()
    user_id = (payload or {}).get("user_id")

    if not visitor_id:
        return {"recorded": False, "message": "visitor_id required"}

    # Check package exists
    pkg_res = await db.execute(select(Package).where(Package.id == package_id))
    pkg = pkg_res.scalars().first()
    if not pkg:
        raise HTTPException(status_code=404, detail="Package not found")

    # Check if already recorded for this visitor or user
    stmt = select(PackageView).where(
        PackageView.package_id == package_id,
        PackageView.visitor_id == visitor_id,
    )
    existing_res = await db.execute(stmt)
    existing = existing_res.scalars().first()

    if not existing:
        new_view = PackageView(package_id=package_id, visitor_id=visitor_id, user_id=user_id)
        db.add(new_view)
        pkg.views_count = int(getattr(pkg, 'views_count', 0) or 0) + 1
        await db.commit()
        await db.refresh(pkg)
        return {"views_count": pkg.views_count, "recorded": True}

    return {"views_count": int(getattr(pkg, 'views_count', 0) or 0), "recorded": False}
