"""Trips API endpoints with complete Guided AI Trip Planner, Security Controls, Dynamic Images, and Public/Private sharing."""

import uuid
import asyncio
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List, Optional, Dict, Any

from app.database.database import get_db
from app.models.trip import Trip, TripStatus, TripMember, MemberRole
from app.models.itinerary import Itinerary, Day, Activity, ActivityCategory
from app.models.budget import Budget, BudgetCategory
from app.models.user import User, UserRole
from app.schemas.trip import (
    TripCreate,
    TripUpdate,
    TripResponse,
    TripMemberAdd,
    ReplanRequest,
    ReplanResponse,
    GuidedPlanRequest,
)
from app.schemas.organizer import OrganizerMatchRequest, OrganizerMatchResult
from app.core.config import get_settings
from app.services.trip_service import TripService
from app.services.marketplace_service import MarketplaceService
from app.services.whatsapp_service import WhatsAppService
from app.services.email_service import EmailService
from app.services.dynamic_research_service import (
    DynamicDestinationResearchService,
    make_maps_url,
    fetch_real_web_photos_multi,
)
from app.agents.replanner_agent import ReplannerAgent
from app.core.security import get_current_user_id
from app.core.logging import get_logger

logger = get_logger("api.trips")
router = APIRouter(prefix="/trips", tags=["Trips"])


BLOCKED_IMAGE_DOMAINS = [
    "instagram.com", "lookaside.instagram.com", "fbsbx.com", "fbcdn.net",
    "pinterest.com", "pinimg.com", "tiktok.com", "tripadvisor.com",
    "facebook.com", "twitter.com", "x.com"
]


def _is_renderable_web_image(url: str) -> bool:
    if not url or not isinstance(url, str):
        return False
    if not (url.startswith("http://") or url.startswith("https://") or url.startswith("/images/")):
        return False
    if url.endswith(".svg") or ".svg" in url.lower():
        return False
    u_low = url.lower()
    return not any(bd in u_low for bd in BLOCKED_IMAGE_DOMAINS)


def normalize_activity_category(act_cat: Any) -> ActivityCategory:
    """Normalize raw category string into supported ActivityCategory enum, preventing silent fallback to OTHER."""
    if not act_cat:
        return ActivityCategory.SIGHTSEEING
    if isinstance(act_cat, ActivityCategory):
        return act_cat
    c = str(act_cat).strip().upper()
    if c in ("TRANSPORT", "TRANSPORTATION", "TRANSIT", "FLIGHT", "DRIVE", "HIGHWAY"):
        return ActivityCategory.TRANSPORT
    if c in ("ACCOMMODATION", "HOTEL", "RESORT", "STAY", "LODGE", "GUESTHOUSE"):
        return ActivityCategory.ACCOMMODATION
    if c in ("FOOD", "DINING", "RESTAURANT", "CAFE", "MEAL", "BREAKFAST", "LUNCH", "DINNER", "BRUNCH"):
        return ActivityCategory.FOOD
    if c in ("ADVENTURE", "HIKING", "TREKKING", "RAFTING", "SPORTS"):
        return ActivityCategory.ADVENTURE
    if c in ("CULTURE", "HERITAGE", "HISTORIC", "MUSEUM", "MONUMENT"):
        return ActivityCategory.CULTURE
    if c in ("SHOPPING", "BAZAAR", "MARKET", "SOUVENIR"):
        return ActivityCategory.SHOPPING
    if c in ("REST", "LEISURE", "RELAX", "RELAXATION"):
        return ActivityCategory.REST
    if c in ("SIGHTSEEING", "NATURE", "SCENIC", "VIEWPOINT", "PARK", "ATTRACTION", "LANDMARK", "LAKE", "VALLEY", "MOUNTAIN"):
        return ActivityCategory.SIGHTSEEING
    try:
        return ActivityCategory[c]
    except KeyError:
        return ActivityCategory.SIGHTSEEING


async def reconcile_trip_activity_costs(
    db: AsyncSession,
    trip_id: str,
    new_budget_total: float,
    accommodation_preference: str = "comfortable",
) -> None:
    """Synchronize all Day activities and Budget categories to match new_budget_total with 100% precision."""
    total_b = max(5000.0, float(new_budget_total))

    # 1. Fetch trip and duration
    trip_obj = await db.get(Trip, trip_id)
    duration_days = trip_obj.duration if trip_obj else 4

    budget_breakdown = DynamicDestinationResearchService.calculate_budget_breakdown(
        budget_total=total_b,
        duration_days=duration_days,
        accommodation_preference=accommodation_preference,
    )

    # 2. Update Budget category table
    budget_res = await db.execute(select(Budget).where(Budget.trip_id == trip_id))
    existing_budgets = budget_res.scalars().all()
    for b in existing_budgets:
        if b.category == BudgetCategory.TRANSPORTATION:
            b.estimated_amount = budget_breakdown["transport"]
        elif b.category == BudgetCategory.ACCOMMODATION:
            b.estimated_amount = budget_breakdown["accommodation"]
        elif b.category == BudgetCategory.FOOD:
            b.estimated_amount = budget_breakdown["food"]
        elif b.category == BudgetCategory.ACTIVITIES:
            b.estimated_amount = budget_breakdown["activities"]
        elif b.category == BudgetCategory.MISCELLANEOUS:
            b.estimated_amount = budget_breakdown["other"]

    # 3. Scale itinerary activities category-by-category to match budget breakdown
    itinerary_res = await db.execute(
        select(Itinerary)
        .where(Itinerary.trip_id == trip_id)
        .options(selectinload(Itinerary.days).selectinload(Day.activities))
    )
    itinerary = itinerary_res.scalar_one_or_none()
    if not itinerary or not itinerary.days:
        return

    all_activities: List[Activity] = []
    for d in itinerary.days:
        for a in d.activities:
            all_activities.append(a)

    if not all_activities:
        return

    def _scale_category_acts(target_pool: int, acts: List[Activity]):
        if not acts:
            return
        old_sum = sum(a.estimated_cost or 0 for a in acts)
        if old_sum > 0:
            alloc = 0
            for i, act in enumerate(acts):
                if i == len(acts) - 1:
                    act.estimated_cost = target_pool - alloc
                else:
                    sc = round((act.estimated_cost / old_sum) * target_pool)
                    act.estimated_cost = sc
                    alloc += sc
        else:
            per = target_pool // len(acts)
            alloc = 0
            for i, act in enumerate(acts):
                if i == len(acts) - 1:
                    act.estimated_cost = target_pool - alloc
                else:
                    act.estimated_cost = per
                    alloc += per

    trans_acts = [a for a in all_activities if a.category == ActivityCategory.TRANSPORT]
    accom_acts = [a for a in all_activities if a.category == ActivityCategory.ACCOMMODATION]
    food_acts = [a for a in all_activities if a.category == ActivityCategory.FOOD]
    other_acts = [a for a in all_activities if a.category not in (ActivityCategory.TRANSPORT, ActivityCategory.ACCOMMODATION, ActivityCategory.FOOD)]

    _scale_category_acts(budget_breakdown["transport"], trans_acts)
    _scale_category_acts(budget_breakdown["accommodation"], accom_acts)
    _scale_category_acts(budget_breakdown["food"], food_acts)
    _scale_category_acts(budget_breakdown["activities"], other_acts)


async def _fetch_web_images_and_research(destination: str, origin: str, variation_seed: Optional[int] = None) -> tuple[Optional[str], list[str]]:
    """Live web search to find real photography for the destination with rotation."""
    photos = await fetch_real_web_photos_multi(destination, destination, limit=8)
    if photos and len(photos) > 0:
        hero_idx = (variation_seed if variation_seed is not None else 0) % len(photos)
        return photos[hero_idx], photos
    return None, []


@router.get("/images/search")
async def search_destination_images(
    query: str,
    destination: Optional[str] = None,
    limit: int = 12,
):
    """Dynamically search and return authentic real-world web photographs for any destination in Pakistan."""
    photos = await fetch_real_web_photos_multi(query, destination or query, limit=limit)
    return {
        "query": query,
        "destination": destination or query,
        "count": len(photos),
        "images": photos,
    }


def _format_trip_response(t, members_override=None) -> TripResponse:
    from app.services.dynamic_research_service import is_valid_direct_image_url
    img = getattr(t, 'image_url', None)
    if img and (str(img).startswith("/images/stitch/") or not is_valid_direct_image_url(str(img))):
        img = None
    prefs = t.preferences if isinstance(t.preferences, dict) else {}
    
    members = []
    if members_override is not None:
        members = members_override
    else:
        lead = prefs.get("lead_contact", {})
        if lead and lead.get("name"):
            members.append({
                "id": "lead-0",
                "name": lead.get("name", "Lead Traveler"),
                "email": lead.get("email", ""),
                "phone": lead.get("phone", ""),
                "role": "LEAD TRAVELER",
                "status": "CONFIRMED",
                "profile_picture": None,
            })
        
        comps = prefs.get("companions", [])
        if isinstance(comps, list):
            for c_idx, c in enumerate(comps):
                if isinstance(c, dict) and (c.get("name") or c.get("email")):
                    members.append({
                        "id": f"comp-{c_idx+1}",
                        "name": c.get("name", f"Companion #{c_idx+1}"),
                        "email": c.get("email", ""),
                        "phone": c.get("phone", ""),
                        "role": "CO-TRAVELER",
                        "status": "CONFIRMED",
                        "profile_picture": None,
                    })

    weather_data = None
    if isinstance(prefs, dict) and prefs.get("weather"):
        weather_data = prefs.get("weather")

    owner_role = "ORGANIZER" if (getattr(t, 'owner_id', '') or '').startswith('org-') or (isinstance(prefs, dict) and prefs.get("is_organizer")) else "TRAVELER"

    return TripResponse(
        id=t.id,
        owner_id=t.owner_id,
        title=t.title,
        destination=t.destination,
        origin=t.origin or "Islamabad",
        duration=t.duration,
        travelers=t.travelers or 1,
        budget_total=t.budget_total,
        budget_per_person=t.budget_per_person,
        start_date=t.start_date,
        end_date=t.end_date,
        status=t.status.value if hasattr(t.status, 'value') else t.status,
        preferences=t.preferences or [],
        constraints=t.constraints or [],
        version=t.version or 1,
        is_public=bool(t.is_public) if hasattr(t, 'is_public') else False,
        show_members_publicly=bool(getattr(t, 'show_members_publicly', 0)),
        allow_cloning=bool(getattr(t, 'allow_cloning', 1)),
        copied_from_trip_id=t.copied_from_trip_id if hasattr(t, 'copied_from_trip_id') else None,
        image_url=img,
        advisories=t.advisories or [] if hasattr(t, 'advisories') else [],
        views_count=int(getattr(t, 'views_count', 0) or 0),
        likes_count=int(getattr(t, 'likes_count', 0) or 0),
        weather=weather_data,
        owner_role=owner_role,
        members=members,
        created_at=t.created_at.isoformat() if t.created_at else "",
        updated_at=t.updated_at.isoformat() if t.updated_at else "",
    )


@router.post("", response_model=TripResponse, status_code=status.HTTP_201_CREATED)
async def create_trip(
    req: TripCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    service = TripService(db)
    trip = await service.create_trip(user_id=user_id, data=req)
    return _format_trip_response(trip)


@router.get("", response_model=List[TripResponse])
async def list_trips(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    service = TripService(db)
    trips = await service.list_user_trips(user_id=user_id)
    return [_format_trip_response(t) for t in trips]


@router.get("/public/community", response_model=List[TripResponse])
async def list_public_community_trips(
    db: AsyncSession = Depends(get_db),
):
    """List all public traveler-created itineraries shared with the Friday community."""
    result = await db.execute(
        select(Trip)
        .where(Trip.is_public == 1)
        .order_by(Trip.created_at.desc())
    )
    trips = result.scalars().all()
    return [_format_trip_response(t) for t in trips]


@router.get("/weather-check")
async def check_weather(
    destination: str,
    departure_date: Optional[str] = None,
    duration_days: int = 3,
    duration: Optional[int] = None,
):
    """Analyze destination weather for selected dates, fetch live multi-day forecast, and return optimal dates."""
    from app.tools.weather import get_weather
    effective_days = duration or duration_days or 3
    try:
        weather_res = await get_weather(
            destination=destination,
            days=effective_days,
            start_date=departure_date,
        )
        data = weather_res.get("data", {}) if isinstance(weather_res, dict) else {}
        return {
            "success": True,
            "destination": destination,
            "current_temp": data.get("current_temp"),
            "feels_like": data.get("feels_like"),
            "condition": data.get("condition", "Pleasant"),
            "description": data.get("description", "Good conditions for expedition"),
            "forecast": data.get("forecast", []),
            "icon": data.get("icon", "sun"),
            "advisory": f"Current weather in {destination} is {data.get('condition', 'pleasant')} ({data.get('current_temp', 24)}°C).",
        }
    except Exception as e:
        logger.warning(f"Weather check failed for {destination}: {e}")
        return {
            "success": False,
            "destination": destination,
            "current_temp": 24,
            "feels_like": 24,
            "condition": "Pleasant",
            "description": "Weather conditions are generally favorable for travel.",
            "forecast": [],
            "icon": "sun",
            "advisory": f"Weather in {destination} is generally suitable for travel.",
        }


@router.post("/validate-destination")
async def validate_destination(
    payload: Dict[str, Any],
):
    """Validate whether the destination is in Pakistan, auto-correct spelling mistakes, and return details."""
    from app.services.pakistan_geo_service import PakistanGeoService
    query = payload.get("destination") or payload.get("query") or ""
    return await PakistanGeoService.validate_and_correct_destination(query)


@router.get("/slot-options")
async def get_hourly_slot_options(
    destination: str,
):
    """Return 4 curated options (A, B, C, D: Let Friday Decide) dynamically for any destination."""
    return DynamicDestinationResearchService.get_slot_options(destination=destination)


@router.get("/{trip_id}", response_model=TripResponse)
async def get_trip(
    trip_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    service = TripService(db)
    trip = await service.get_trip(trip_id=trip_id, user_id=user_id)
    
    # Increment views count every time the trip is viewed
    try:
        trip.views_count = int(getattr(trip, 'views_count', 0) or 0) + 1
        await db.commit()
        await db.refresh(trip)
    except Exception as e:
        logger.warning(f"Could not increment views_count: {e}")

    # Enrich members with Google profile photos and verified names (hide email & phone if public)
    is_public = bool(trip.is_public)
    members = []
    owner_user = await db.get(User, trip.owner_id)
    prefs = trip.preferences if isinstance(trip.preferences, dict) else {}
    lead = prefs.get("lead_contact", {})

    owner_name = (owner_user.name if owner_user and owner_user.name else None) or lead.get("name") or "Lead Traveler"
    owner_photo = owner_user.profile_picture if owner_user else None
    owner_email = (owner_user.email if owner_user else None) or lead.get("email", "")
    owner_phone = lead.get("phone", "")

    members.append({
        "id": trip.owner_id,
        "name": owner_name,
        "email": "" if is_public else owner_email,
        "phone": "" if is_public else owner_phone,
        "role": "LEAD TRAVELER",
        "status": "HOST / OWNER",
        "profile_picture": owner_photo,
    })

    comps = prefs.get("companions", [])
    if isinstance(comps, list):
        for c_idx, c in enumerate(comps):
            if isinstance(c, dict) and (c.get("name") or c.get("email")):
                c_email = (c.get("email") or "").strip().lower()
                c_photo = None
                if c_email:
                    u_res = await db.execute(select(User).where(User.email == c_email))
                    u_obj = u_res.scalars().first()
                    if u_obj and u_obj.profile_picture:
                        c_photo = u_obj.profile_picture
                members.append({
                    "id": f"comp-{c_idx+1}",
                    "name": c.get("name", f"Companion #{c_idx+1}"),
                    "email": "" if is_public else c.get("email", ""),
                    "phone": "" if is_public else c.get("phone", ""),
                    "role": "CO-TRAVELER",
                    "status": "CONFIRMED TRAVELER",
                    "profile_picture": c_photo,
                })

    return _format_trip_response(trip, members_override=members)


@router.post("/{trip_id}/view")
async def record_trip_view(
    trip_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Record an impression view (+1) for a trip."""
    trip = await db.get(Trip, trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    trip.views_count = int(getattr(trip, 'views_count', 0) or 0) + 1
    await db.commit()
    await db.refresh(trip)
    return {"views_count": trip.views_count, "recorded": True}


@router.post("/{trip_id}/like")
async def toggle_trip_like(
    trip_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Toggle or record like (+1) on a public community trip."""
    trip = await db.get(Trip, trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    trip.likes_count = int(getattr(trip, 'likes_count', 0) or 0) + 1
    await db.commit()
    await db.refresh(trip)
    return {"likes_count": trip.likes_count, "liked": True}


async def _dispatch_trip_notifications_background(
    trip_id: str,
    trip_title: str,
    destination: str,
    duration: int,
    travelers: int,
    budget_total: float,
    lead_name: str,
    lead_email: Optional[str],
    lead_phone: Optional[str],
    companions: list,
):
    """Asynchronous background dispatcher for trip notification emails and WhatsApp alerts."""
    from app.services.email_service import EmailService
    from app.services.whatsapp_service import WhatsAppService

    cfg = get_settings()
    frontend_base = cfg.FRONTEND_URL or "https://friday-jet-mu.vercel.app"
    trip_url = f"{frontend_base}/trips/{trip_id}"
    email_service = EmailService()
    whatsapp_service = WhatsAppService()

    # 1. Lead Traveler Notification
    if lead_email:
        try:
            await email_service.send_trip_planned_notification(
                trip_id=trip_id,
                traveler_email=lead_email,
                traveler_name=lead_name,
                trip_title=trip_title,
                destination=destination,
                travelers_count=travelers,
                budget_total=budget_total,
            )
            logger.info(f"Dispatched trip planned email to lead traveler: {lead_email}")
        except Exception as e:
            logger.warning(f"Failed to send email to lead traveler {lead_email}: {e}")

    if lead_phone:
        try:
            wa_msg = (
                f"🎒 *FRIDAY® TRIP PLAN READY: {trip_title}*\n\n"
                f"Salam {lead_name}! Your custom {duration}-day itinerary to {destination} is generated and ready.\n\n"
                f"📍 *Destination*: {destination}\n"
                f"👥 *Travelers*: {travelers} People\n"
                f"💰 *Budget*: PKR {budget_total:,.0f}\n\n"
                f"🔗 *View Itinerary*: {trip_url}\n\n"
                f"— *Friday® AI Travel Copilot*"
            )
            await whatsapp_service.send_message(to_number=lead_phone, message=wa_msg)
            logger.info(f"Dispatched WhatsApp to lead traveler: {lead_phone}")
        except Exception as e:
            logger.warning(f"Failed to send WhatsApp to lead {lead_phone}: {e}")

    # 2. ALL Companions / Co-Travelers Notification
    if isinstance(companions, list):
        for comp in companions:
            if not isinstance(comp, dict):
                continue
            comp_email = (comp.get("email") or "").strip()
            comp_name = (comp.get("name") or "Co-Traveler").strip()
            comp_phone = (comp.get("phone") or "").strip()

            if comp_email:
                try:
                    await email_service.send_trip_planned_notification(
                        trip_id=trip_id,
                        traveler_email=comp_email,
                        traveler_name=comp_name,
                        trip_title=trip_title,
                        destination=destination,
                        travelers_count=travelers,
                        budget_total=budget_total,
                    )
                    logger.info(f"Dispatched trip planned email to co-traveler {comp_name} ({comp_email})")
                except Exception as e:
                    logger.warning(f"Failed to send email to co-traveler {comp_email}: {e}")

            if comp_phone:
                try:
                    comp_wa_msg = (
                        f"🎒 *FRIDAY® EXPEDITION INVITATION: {trip_title}*\n\n"
                        f"Salam {comp_name}! You have been added as a co-traveler by {lead_name} for an expedition to {destination}.\n\n"
                        f"📍 *Destination*: {destination}\n"
                        f"👥 *Group Size*: {travelers} Travelers\n"
                        f"💰 *Estimated Budget*: PKR {budget_total:,.0f}\n\n"
                        f"🔗 *View Complete Itinerary & Schedule*:\n{trip_url}\n\n"
                        f"— *Friday® AI Travel Copilot*"
                    )
                    await whatsapp_service.send_message(to_number=comp_phone, message=comp_wa_msg)
                    logger.info(f"Dispatched WhatsApp to co-traveler {comp_name} ({comp_phone})")
                except Exception as e:
                    logger.warning(f"Failed to send WhatsApp to co-traveler {comp_name}: {e}")


async def _dispatch_trip_notifications(trip: Trip, db: AsyncSession):
    """Resolves traveler contacts and schedules non-blocking background email & WhatsApp dispatches."""
    prefs = trip.preferences if isinstance(trip.preferences, dict) else {}
    lead_c = prefs.get("lead_contact", {})
    companions = prefs.get("companions", [])

    owner_user = await db.get(User, trip.owner_id)
    if not owner_user:
        u_res = await db.execute(
            select(User).where(
                (User.id == trip.owner_id) | (User.email == trip.owner_id) | (User.firebase_uid == trip.owner_id)
            )
        )
        owner_user = u_res.scalars().first()

    lead_name = lead_c.get("name") or (owner_user.name if owner_user else "Lead Traveler")
    lead_email = lead_c.get("email") or (owner_user.email if owner_user else None)
    lead_phone = lead_c.get("phone") or (getattr(owner_user, 'phone', None) if owner_user else None)

    # Launch background task without blocking the HTTP request
    asyncio.create_task(_dispatch_trip_notifications_background(
        trip_id=trip.id,
        trip_title=trip.title or "Expedition",
        destination=trip.destination or "Pakistan",
        duration=trip.duration or 3,
        travelers=trip.travelers or 1,
        budget_total=trip.budget_total or 0,
        lead_name=lead_name,
        lead_email=lead_email,
        lead_phone=lead_phone,
        companions=companions,
    ))


@router.patch("/{trip_id}", response_model=TripResponse)
async def update_trip(
    trip_id: str,
    req: TripUpdate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    service = TripService(db)
    trip = await service.get_trip(trip_id=trip_id, user_id=user_id)
    if trip.owner_id != user_id:
        raise HTTPException(status_code=403, detail="Security Alert: Only the trip owner can modify this trip.")
    
    trip = await service.update_trip(trip_id=trip_id, user_id=user_id, data=req)
    if req.is_public is not None:
        trip.is_public = 1 if req.is_public else 0
    if req.image_url:
        trip.image_url = req.image_url

    # Strict Budget Reconciliation: update activity costs and budget records to match new budget
    if req.budget_total is not None and req.budget_total > 0:
        pref = "comfortable"
        if isinstance(trip.preferences, dict):
            pref = trip.preferences.get("accommodation_preference", "comfortable")
        await reconcile_trip_activity_costs(db, trip.id, req.budget_total, pref)

    await db.commit()

    return _format_trip_response(trip)


# ─── GUIDED AI PLANNER ENDPOINT ───────────────────────────────────────────
@router.post("/guided-plan", status_code=status.HTTP_201_CREATED)
async def generate_guided_trip_plan(
    req: GuidedPlanRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Complete Guided AI Trip Planning Endpoint."""
    dest = (req.destination or req.destination_query or "Islamabad").strip()
    origin = (req.origin or "Islamabad").strip()

    # 0. Geographic Verification & Auto-Correction for Pakistan
    from app.services.pakistan_geo_service import PakistanGeoService
    geo_res = await PakistanGeoService.validate_and_correct_destination(dest)
    if not geo_res.get("is_valid_pakistan"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=geo_res.get("error") or f"Friday is Pakistan's exclusive AI travel architect. We only curate trips within Pakistan. '{dest}' is outside Pakistan."
        )
    dest = geo_res.get("corrected_destination") or dest
    
    # 1. Resolve duration days
    duration_days = 4
    if req.duration_days and req.duration_days > 0:
        duration_days = req.duration_days
    elif req.duration == "1_day":
        duration_days = 1
    elif req.duration == "2-3_days":
        duration_days = 3
    elif req.duration == "4-6_days":
        duration_days = 5
    elif req.duration == "7+_days":
        duration_days = 7

    # 2. Resolve budget calculations
    travelers = max(1, min(10, req.travelers))
    raw_budget = req.budget or 10000.0
    if req.budget_type == "per_person":
        budget_pp = raw_budget
        budget_total = raw_budget * travelers
    else:
        budget_total = raw_budget
        budget_pp = raw_budget / travelers

    # 3. Dynamic destination real web image resolution via Tavily / Web Search & Wikipedia rotation
    import random
    gen_seed = random.randint(0, 100000)
    img_url, web_images = await _fetch_web_images_and_research(dest, origin, variation_seed=gen_seed)
    title = f"{dest}, at your pace"

    # 4. Generate Friday AI Research Advisories
    advisories = [
        {
            "id": "adv-1",
            "type": "RECOMMENDATION",
            "title": "FRIDAY RECOMMENDS",
            "message": f"Visit {dest} key scenic viewpoints before sunset (around 05:30 PM) for optimal golden hour photography and mountain clarity.",
            "action": "sunset_timing",
        },
        {
            "id": "adv-2",
            "type": "TIMING",
            "title": "BEST TIME",
            "message": f"Early morning departures (06:00 AM) are recommended from {origin} to avoid connecting highway traffic.",
            "action": "early_departure",
        },
        {
            "id": "adv-3",
            "type": "ROUTE",
            "title": "ROUTE NOTE",
            "message": f"Routes to {dest} from {origin} may require 4x4 high-clearance jeep transit for upper mountain trails.",
            "action": "jeep_route",
        },
        {
            "id": "adv-4",
            "type": "WEATHER",
            "title": "WEATHER ADVISORY",
            "message": "High-altitude alpine conditions can shift quickly after dusk. Pack windproof thermals, waterproof outer shells, and solid hiking footwear.",
            "action": "weather_gear",
        },
    ]

    # 5. Build Dynamic Day-by-Day structured schedule with live POI discovery & per-POI image search
    days_data, researched_hero = await DynamicDestinationResearchService.generate_dynamic_itinerary_days(
        destination=dest,
        origin=origin,
        duration_days=duration_days,
        budget_total=budget_total,
        accommodation_preference=req.accommodation_preference or "comfortable",
    )

    # 5b. Globally Unique Image Reservation
    from app.services.dynamic_research_service import is_valid_direct_image_url

    trip_id = str(uuid.uuid4())
    candidates = []
    if researched_hero and is_valid_direct_image_url(researched_hero):
        candidates.append(researched_hero)
    if web_images:
        candidates.extend(w for w in web_images if is_valid_direct_image_url(w))
    if img_url and is_valid_direct_image_url(img_url) and img_url not in candidates:
        candidates.append(img_url)

    # Filter out stitch assets or invalid URLs
    valid_candidates = [c for c in candidates if c and not str(c).startswith("/images/stitch/")]

    try:
        from app.services.image_reservation_service import claim_unique_image
        claimed_url = await claim_unique_image(
            candidate_urls=valid_candidates,
            entity_type="trip",
            entity_id=trip_id,
            destination=dest,
            session=db,
        )
        img_url = claimed_url
    except Exception as e:
        logger.warning(f"Image reservation failed (non-fatal), using first valid candidate: {e}")
        img_url = valid_candidates[0] if valid_candidates else None

    # 6. Compute Deterministic Budget Breakdown
    budget_breakdown = DynamicDestinationResearchService.calculate_budget_breakdown(
        budget_total=budget_total,
        duration_days=duration_days,
        accommodation_preference=req.accommodation_preference or "comfortable",
    )

    # 7. Create DB Records (Trip, TripMember, Itinerary, Days, Activities, Budget)
    user_obj = await db.get(User, user_id)
    if not user_obj:
        lead_c = req.lead_contact or {}
        user_obj = User(
            id=user_id,
            email=lead_c.get("email") or f"{user_id}@friday.local",
            name=lead_c.get("name") or "Lead Traveler",
            role=UserRole.TRAVELER,
        )
        db.add(user_obj)
        await db.flush()

    traveler_metadata = {
        "travel_styles": req.travel_styles or ["Nature", "Scenic"],
        "lead_contact": req.lead_contact or {},
        "companions": req.companions or [],
    }

    try:
        from app.tools.weather import get_weather
        weather_res = await get_weather(
            destination=dest,
            days=duration_days,
            start_date=req.departure_date,
        )
        if weather_res and weather_res.get("success"):
            traveler_metadata["weather"] = weather_res.get("data")
    except Exception as e:
        logger.warning(f"Could not attach weather to trip metadata: {e}")

    trip = Trip(
        id=trip_id,
        owner_id=user_id,
        title=title,
        destination=dest,
        origin=origin,
        duration=duration_days,
        travelers=travelers,
        budget_total=budget_total,
        budget_per_person=budget_pp,
        start_date=req.departure_date,
        end_date=req.return_date,
        status=TripStatus.DRAFT,
        preferences=traveler_metadata,
        constraints=[req.additional_preferences] if req.additional_preferences else [],
        version=1,
        is_public=0,
        show_members_publicly=1 if req.show_members_publicly else 0,
        allow_cloning=1 if req.allow_cloning else 0,
        image_url=img_url,
        advisories=advisories,
    )
    db.add(trip)
    await db.flush()

    # Add Owner Member
    owner_member = TripMember(
        trip_id=trip.id,
        user_id=user_id,
        role=MemberRole.OWNER,
        invitation_status="ACCEPTED",
    )
    db.add(owner_member)

    # Create Itinerary
    itinerary_obj = Itinerary(
        trip_id=trip.id,
        version=1,
        notes=req.additional_preferences or "Crafted by Friday AI Travel Copilot.",
    )
    db.add(itinerary_obj)
    await db.flush()

    # Create Days & Activities with verified Google Maps URLs
    for d_data in days_data:
        day_obj = Day(
            itinerary_id=itinerary_obj.id,
            day_number=d_data["day_number"],
            title=d_data["title"],
            summary=d_data["summary"],
        )
        db.add(day_obj)
        await db.flush()

        for a_data in d_data["activities"]:
            act_cat = normalize_activity_category(a_data.get("category", "SIGHTSEEING"))

            act_obj = Activity(
                day_id=day_obj.id,
                order=a_data["order"],
                title=a_data["title"],
                description=a_data["description"],
                location=a_data.get("location"),
                latitude=a_data.get("latitude"),
                longitude=a_data.get("longitude"),
                start_time=a_data["start_time"],
                end_time=a_data["end_time"],
                duration_minutes=a_data["duration_minutes"],
                estimated_cost=a_data["estimated_cost"],
                category=act_cat,
                image_url=a_data.get("image_url"),
                notes=a_data.get("map_url"),
                confidence=a_data.get("confidence", 0.95 if a_data.get("latitude") else 0.70),
            )
            db.add(act_obj)

    # Create Budget Category Records
    budget_records = [
        Budget(trip_id=trip.id, category=BudgetCategory.TRANSPORTATION, estimated_amount=budget_breakdown["transport"], version="1"),
        Budget(trip_id=trip.id, category=BudgetCategory.ACCOMMODATION, estimated_amount=budget_breakdown["accommodation"], version="1"),
        Budget(trip_id=trip.id, category=BudgetCategory.FOOD, estimated_amount=budget_breakdown["food"], version="1"),
        Budget(trip_id=trip.id, category=BudgetCategory.ACTIVITIES, estimated_amount=budget_breakdown["activities"], version="1"),
        Budget(trip_id=trip.id, category=BudgetCategory.MISCELLANEOUS, estimated_amount=budget_breakdown["other"], version="1"),
    ]
    for b in budget_records:
        db.add(b)

    await db.commit()

    return {
        "id": trip.id,
        "trip": _format_trip_response(trip),
        "itinerary": {
            "id": itinerary_obj.id,
            "version": 1,
            "days": days_data,
        },
        "budget_breakdown": budget_breakdown,
        "advisories": advisories,
        "message": f"Successfully planned your {duration_days}-day journey to {dest}!",
    }





# ─── PUBLISH TRIP & DISPATCH EMAILS / WHATSAPP ───────────────────────────
@router.post("/{trip_id}/publish")
async def publish_trip(
    trip_id: str,
    payload: Optional[Dict[str, Any]] = None,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Publish a trip (Public or Private) and trigger automated Email and WhatsApp dispatches."""
    service = TripService(db)
    trip = await service.get_trip(trip_id=trip_id, user_id=user_id)
    if trip.owner_id != user_id:
        raise HTTPException(status_code=403, detail="Security Alert: Only the trip creator can publish this trip.")

    is_pub = False
    if payload and "is_public" in payload:
        is_pub = bool(payload["is_public"])
    trip.is_public = 1 if is_pub else 0
    if payload and "show_members_publicly" in payload:
        trip.show_members_publicly = 1 if payload["show_members_publicly"] else 0
    if payload and "allow_cloning" in payload:
        trip.allow_cloning = 1 if payload["allow_cloning"] else 0
    trip.status = TripStatus.PLANNED

    # Load days and activities for high-fidelity rendering
    itinerary_result = await db.execute(
        select(Itinerary)
        .where(Itinerary.trip_id == trip.id)
        .options(selectinload(Itinerary.days).selectinload(Day.activities))
    )
    itinerary = itinerary_result.scalar_one_or_none()

    itinerary_days = []
    if itinerary and itinerary.days:
        for d in itinerary.days:
            acts = []
            for a in d.activities:
                acts.append({
                    "id": a.id,
                    "order": a.order,
                    "title": a.title,
                    "description": a.description,
                    "location": a.location,
                    "latitude": a.latitude,
                    "longitude": a.longitude,
                    "start_time": a.start_time,
                    "end_time": a.end_time,
                    "duration_minutes": a.duration_minutes,
                    "estimated_cost": a.estimated_cost,
                    "category": a.category.value if hasattr(a.category, 'value') else a.category,
                    "image_url": a.image_url,
                    "map_url": a.notes or make_maps_url(a.location or a.title or trip.destination, trip.destination, a.latitude, a.longitude),
                    "notes": a.notes,
                    "location_verified": bool(a.latitude and a.longitude),
                })
            itinerary_days.append({
                "day_number": d.day_number,
                "title": d.title,
                "summary": d.summary,
                "activities": acts,
            })

    # Fetch budget records
    budget_res = await db.execute(select(Budget).where(Budget.trip_id == trip.id))
    budgets = budget_res.scalars().all()
    budget_summary = {"total": trip.budget_total or 0}
    for b in budgets:
        cat_key = b.category.value.lower() if hasattr(b.category, 'value') else str(b.category).lower()
        budget_summary[cat_key] = b.estimated_amount

    await db.commit()

    # Automated Dispatch to Lead & ALL Companions via WhatsApp and Email
    await _dispatch_trip_notifications(trip, db)

    return {
        "trip": _format_trip_response(trip),
        "itinerary": {
            "days": itinerary_days,
        },
        "budget_summary": budget_summary,
        "message": f"Expedition published successfully as {'Public (Shared with Community)' if is_pub else 'Private (Expedition Vault)'}! Itinerary dispatched to lead and co-travelers.",
        "is_public": bool(trip.is_public),
    }


# ─── TOGGLE VISIBILITY & CLONING PERMISSION ────────────────────────────────
@router.post("/{trip_id}/visibility")
async def toggle_trip_visibility(
    trip_id: str,
    is_public: Optional[bool] = None,
    allow_cloning: Optional[bool] = None,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Toggle whether a trip is public on community feed and whether other travelers can clone it."""
    service = TripService(db)
    trip = await service.get_trip(trip_id=trip_id, user_id=user_id)
    if trip.owner_id != user_id:
        raise HTTPException(status_code=403, detail="Security Alert: Only trip owner can adjust visibility.")

    if is_public is not None:
        trip.is_public = 1 if is_public else 0
    if allow_cloning is not None:
        trip.allow_cloning = 1 if allow_cloning else 0
    await db.commit()
    await db.refresh(trip)
    return {"message": "Trip visibility updated.", "is_public": bool(trip.is_public), "allow_cloning": bool(trip.allow_cloning)}


# ─── CLONE / COPY TRIP FOR TRAVELER ───────────────────────────────────────
@router.post("/{trip_id}/copy", status_code=status.HTTP_201_CREATED)
@router.post("/{trip_id}/clone", status_code=status.HTTP_201_CREATED)
async def copy_or_clone_trip(
    trip_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Clone an existing public or accessible trip into a brand new private Draft for the current user."""
    # 1. Fetch original trip with its itinerary, days, activities, and budget
    result = await db.execute(
        select(Trip)
        .where(Trip.id == trip_id)
        .options(
            selectinload(Trip.itinerary).selectinload(Itinerary.days).selectinload(Day.activities),
            selectinload(Trip.budgets),
        )
    )
    orig_trip = result.scalar_one_or_none()
    if not orig_trip:
        raise HTTPException(status_code=404, detail="Trip plan not found.")

    # 2. Check Permissions: Organizers are prohibited from copying traveler trips
    cur_user = await db.get(User, user_id)
    if not cur_user:
        cur_user = User(
            id=user_id,
            email=f"{user_id}@friday.local",
            name="Community Traveler",
            role=UserRole.TRAVELER,
        )
        db.add(cur_user)
        await db.flush()

    user_role = cur_user.role.value if hasattr(cur_user.role, 'value') else str(cur_user.role)
    if user_role == "ORGANIZER":
        raise HTTPException(
            status_code=403,
            detail="Organizers cannot copy traveler trip itineraries. Only traveler accounts can clone community trips."
        )

    # 3. Check Permissions: owner can always clone; other users can clone ONLY if trip is public and allow_cloning is true
    if orig_trip.owner_id != user_id:
        if not bool(orig_trip.is_public):
            raise HTTPException(status_code=403, detail="This trip is private and cannot be copied.")
        if not bool(getattr(orig_trip, 'allow_cloning', 1)):
            raise HTTPException(status_code=403, detail="The creator has disabled copying for this itinerary.")

    cur_name = cur_user.name or "Lead Traveler"
    cur_email = cur_user.email or f"{user_id}@friday.local"
    cur_phone = getattr(cur_user, "phone", "") or ""

    # 4. Clone preferences with fresh lead traveler & empty companion slots
    new_prefs = dict(orig_trip.preferences) if isinstance(orig_trip.preferences, dict) else {}
    new_prefs["lead_contact"] = {
        "name": cur_name,
        "email": cur_email,
        "phone": cur_phone,
    }
    new_prefs["companions"] = []  # Reset companions so new user adds their own group members

    # 5. Create New Cloned Trip Record
    new_trip = Trip(
        owner_id=user_id,
        title=f"Copy of {orig_trip.title}" if orig_trip.title else f"{orig_trip.destination} Expedition",
        destination=orig_trip.destination,
        origin=orig_trip.origin,
        duration=orig_trip.duration,
        travelers=1,
        budget_total=orig_trip.budget_total,
        budget_per_person=orig_trip.budget_per_person,
        start_date=orig_trip.start_date,
        end_date=orig_trip.end_date,
        status=TripStatus.DRAFT,
        preferences=new_prefs,
        constraints=list(orig_trip.constraints) if isinstance(orig_trip.constraints, list) else [],
        version=1,
        is_public=0,  # Cloned trips start as private drafts
        show_members_publicly=0,
        allow_cloning=1,
        copied_from_trip_id=orig_trip.id,
        image_url=orig_trip.image_url,
        advisories=list(orig_trip.advisories) if isinstance(orig_trip.advisories, list) else [],
    )
    db.add(new_trip)
    await db.flush()

    # 6. Add Current User as Owner
    new_member = TripMember(
        trip_id=new_trip.id,
        user_id=user_id,
        role=MemberRole.OWNER,
        invitation_status="ACCEPTED",
    )
    db.add(new_member)

    # 7. Deep Copy Itinerary, Days & Activities
    days_summary = []
    if orig_trip.itinerary:
        new_itin = Itinerary(
            trip_id=new_trip.id,
            version=1,
            notes=orig_trip.itinerary.notes or "Cloned expedition itinerary.",
        )
        db.add(new_itin)
        await db.flush()

        if orig_trip.itinerary.days:
            for d in orig_trip.itinerary.days:
                new_day = Day(
                    itinerary_id=new_itin.id,
                    day_number=d.day_number,
                    title=d.title,
                    summary=d.summary,
                )
                db.add(new_day)
                await db.flush()

                acts_list = []
                for a in d.activities:
                    new_act = Activity(
                        day_id=new_day.id,
                        order=a.order,
                        title=a.title,
                        description=a.description,
                        location=a.location,
                        start_time=a.start_time,
                        end_time=a.end_time,
                        duration_minutes=a.duration_minutes,
                        estimated_cost=a.estimated_cost,
                        category=a.category,
                        image_url=a.image_url,
                        notes=a.notes,
                    )
                    db.add(new_act)
                    acts_list.append({
                        "id": new_act.id,
                        "title": new_act.title,
                        "description": new_act.description,
                        "location": new_act.location,
                        "start_time": new_act.start_time,
                        "end_time": new_act.end_time,
                        "category": new_act.category.value if hasattr(new_act.category, 'value') else str(new_act.category),
                        "map_url": new_act.notes,
                    })

                days_summary.append({
                    "id": new_day.id,
                    "day_number": new_day.day_number,
                    "title": new_day.title,
                    "summary": new_day.summary,
                    "activities": acts_list,
                })

    # 8. Deep Copy Budgets
    if orig_trip.budgets:
        for b in orig_trip.budgets:
            new_b = Budget(
                trip_id=new_trip.id,
                category=b.category,
                estimated_amount=b.estimated_amount,
                actual_amount=0.0,
                notes=getattr(b, 'notes', None),
                version="1",
            )
            db.add(new_b)

    await db.commit()
    await db.refresh(new_trip)

    return {
        "id": new_trip.id,
        "trip": _format_trip_response(new_trip),
        "days": days_summary,
        "message": f"Successfully cloned itinerary for {new_trip.destination}! You can now customize your group members and schedule in your draft.",
    }


# ─── ACTIVITY & DAY CRUD (A-TO-Z CUSTOM EDITING) ──────────────────────────
@router.post("/{trip_id}/days/{day_id}/activities", status_code=status.HTTP_201_CREATED)
async def add_custom_activity(
    trip_id: str,
    day_id: str,
    payload: Dict[str, Any],
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Add a custom stop/activity to a day."""
    service = TripService(db)
    trip = await service.get_trip(trip_id=trip_id, user_id=user_id)
    if trip.owner_id != user_id:
        raise HTTPException(status_code=403, detail="Only trip owner can add activities.")

    cat_str = payload.get("category", "SIGHTSEEING")
    act_cat = normalize_activity_category(cat_str)

    location = payload.get("location", trip.destination)
    verified_loc = await DynamicDestinationResearchService.verify_place_location_live(location, trip.destination)
    map_url = payload.get("map_url") or verified_loc["maps_url"]

    act = Activity(
        day_id=day_id,
        order=int(payload.get("order", 99)),
        title=payload.get("title", "Custom Activity"),
        description=payload.get("description", ""),
        location=verified_loc["address"] if verified_loc["location_verified"] else location,
        latitude=verified_loc["latitude"],
        longitude=verified_loc["longitude"],
        start_time=payload.get("start_time", "10:00 AM"),
        end_time=payload.get("end_time", "12:00 PM"),
        duration_minutes=int(payload.get("duration_minutes", 120)),
        estimated_cost=float(payload.get("estimated_cost", 0)),
        category=act_cat,
        image_url=payload.get("image_url", trip.image_url),
        notes=map_url,
        confidence=0.95 if verified_loc["location_verified"] else 0.70,
    )
    db.add(act)
    await db.commit()
    await db.refresh(act)
    return {
        "id": act.id,
        "day_id": act.day_id,
        "title": act.title,
        "description": act.description,
        "location": act.location,
        "latitude": act.latitude,
        "longitude": act.longitude,
        "location_verified": bool(act.latitude and act.longitude),
        "start_time": act.start_time,
        "end_time": act.end_time,
        "duration_minutes": act.duration_minutes,
        "estimated_cost": act.estimated_cost,
        "category": act.category.value if hasattr(act.category, 'value') else act.category,
        "image_url": act.image_url,
        "map_url": act.notes,
    }


@router.patch("/{trip_id}/activities/{activity_id}")
async def update_custom_activity(
    trip_id: str,
    activity_id: str,
    payload: Dict[str, Any],
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Update details of an activity stop."""
    service = TripService(db)
    trip = await service.get_trip(trip_id=trip_id, user_id=user_id)
    if trip.owner_id != user_id:
        raise HTTPException(status_code=403, detail="Only trip owner can edit activities.")

    res = await db.execute(select(Activity).where(Activity.id == activity_id))
    act = res.scalar_one_or_none()
    if not act:
        raise HTTPException(status_code=404, detail="Activity not found.")

    if "title" in payload:
        act.title = payload["title"]
    if "description" in payload:
        act.description = payload["description"]
    if "location" in payload:
        verified_loc = await DynamicDestinationResearchService.verify_place_location_live(payload["location"], trip.destination)
        act.location = verified_loc["address"] if verified_loc["location_verified"] else payload["location"]
        act.latitude = verified_loc["latitude"]
        act.longitude = verified_loc["longitude"]
        act.notes = payload.get("map_url") or verified_loc["maps_url"]
    if "start_time" in payload:
        act.start_time = payload["start_time"]
    if "end_time" in payload:
        act.end_time = payload["end_time"]
    if "duration_minutes" in payload:
        act.duration_minutes = int(payload["duration_minutes"])
    if "estimated_cost" in payload:
        act.estimated_cost = float(payload["estimated_cost"])
    if "category" in payload:
        act.category = normalize_activity_category(payload["category"])
    if "map_url" in payload:
        act.notes = payload["map_url"]

    await db.commit()
    await db.refresh(act)
    return {
        "id": act.id,
        "title": act.title,
        "description": act.description,
        "location": act.location,
        "start_time": act.start_time,
        "end_time": act.end_time,
        "duration_minutes": act.duration_minutes,
        "estimated_cost": act.estimated_cost,
        "category": act.category.value if hasattr(act.category, 'value') else act.category,
        "map_url": act.notes,
    }


@router.delete("/{trip_id}/activities/{activity_id}")
async def delete_custom_activity(
    trip_id: str,
    activity_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Delete an activity stop."""
    service = TripService(db)
    trip = await service.get_trip(trip_id=trip_id, user_id=user_id)
    if trip.owner_id != user_id:
        raise HTTPException(status_code=403, detail="Only trip owner can delete activities.")

    res = await db.execute(select(Activity).where(Activity.id == activity_id))
    act = res.scalar_one_or_none()
    if not act:
        raise HTTPException(status_code=404, detail="Activity not found.")

    await db.delete(act)
    await db.commit()
    return {"message": "Activity successfully removed."}


@router.patch("/{trip_id}/days/{day_id}")
async def update_custom_day(
    trip_id: str,
    day_id: str,
    payload: Dict[str, Any],
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Update title and summary of an itinerary day."""
    service = TripService(db)
    trip = await service.get_trip(trip_id=trip_id, user_id=user_id)
    if trip.owner_id != user_id:
        raise HTTPException(status_code=403, detail="Only trip owner can edit days.")

    res = await db.execute(select(Day).where(Day.id == day_id))
    day = res.scalar_one_or_none()
    if not day:
        raise HTTPException(status_code=404, detail="Day not found.")

    if "title" in payload:
        day.title = payload["title"]
    if "summary" in payload:
        day.summary = payload["summary"]

    await db.commit()
    await db.refresh(day)
    return {"id": day.id, "day_number": day.day_number, "title": day.title, "summary": day.summary}


@router.post("/{trip_id}/days", status_code=status.HTTP_201_CREATED)
async def add_custom_day(
    trip_id: str,
    payload: Dict[str, Any],
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Add a new day to an itinerary."""
    service = TripService(db)
    trip = await service.get_trip(trip_id=trip_id, user_id=user_id)
    if trip.owner_id != user_id:
        raise HTTPException(status_code=403, detail="Only trip owner can add days.")

    itin_res = await db.execute(
        select(Itinerary).options(selectinload(Itinerary.days)).where(Itinerary.trip_id == trip_id)
    )
    itin = itin_res.scalar_one_or_none()
    if not itin:
        raise HTTPException(status_code=404, detail="Itinerary not found.")

    existing_days = itin.days or []
    next_day_num = max([d.day_number for d in existing_days], default=0) + 1

    new_day = Day(
        itinerary_id=itin.id,
        day_number=next_day_num,
        title=payload.get("title") or f"Day {next_day_num}: Exploration & Highlights of {trip.destination}",
        summary=payload.get("summary") or f"Custom planned day exploring {trip.destination}.",
    )
    db.add(new_day)
    trip.duration = next_day_num
    await db.commit()
    await db.refresh(new_day)

    return {
        "id": new_day.id,
        "day_number": new_day.day_number,
        "title": new_day.title,
        "summary": new_day.summary,
        "activities": [],
    }


@router.delete("/{trip_id}/days/{day_id}")
async def delete_custom_day(
    trip_id: str,
    day_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Delete an itinerary day."""
    service = TripService(db)
    trip = await service.get_trip(trip_id=trip_id, user_id=user_id)
    if trip.owner_id != user_id:
        raise HTTPException(status_code=403, detail="Only trip owner can delete days.")

    res = await db.execute(select(Day).where(Day.id == day_id))
    day = res.scalar_one_or_none()
    if not day:
        raise HTTPException(status_code=404, detail="Day not found.")

    await db.delete(day)
    await db.commit()
    return {"message": "Day successfully removed."}


# ─── VISIBILITY TOGGLE (PRIVATE vs PUBLIC) ────────────────────────────────
@router.post("/{trip_id}/visibility", response_model=TripResponse)
async def toggle_trip_visibility(
    trip_id: str,
    is_public: bool,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Toggle visibility of an AI plan between Private and Public Community Post with Security Check."""
    service = TripService(db)
    trip = await service.get_trip(trip_id=trip_id, user_id=user_id)
    if trip.owner_id != user_id:
        raise HTTPException(status_code=403, detail="Security Alert: Only the trip creator can change its visibility.")
    trip.is_public = 1 if is_public else 0
    await db.commit()
    return _format_trip_response(trip)


# ─── COPY PUBLIC TRIP ENDPOINT ────────────────────────────────────────────
@router.post("/{trip_id}/copy", status_code=status.HTTP_201_CREATED)
async def copy_public_trip(
    trip_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Clone an existing public trip into a private editable copy for current user."""
    result = await db.execute(
        select(Trip)
        .options(
            selectinload(Trip.itinerary).selectinload(Itinerary.days).selectinload(Day.activities),
            selectinload(Trip.budgets),
        )
        .where(Trip.id == trip_id)
    )
    original_trip = result.scalar_one_or_none()
    if not original_trip:
        raise HTTPException(status_code=404, detail="Trip to copy was not found.")

    if not original_trip.is_public:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This itinerary is private and cannot be copied. Only public itineraries can be copied.",
        )

    if original_trip.owner_id == user_id:
        raise HTTPException(status_code=400, detail="You already own this trip. You can directly customize your own itinerary.")

    # Role compatibility check: User can only copy User trips; Organizer can only copy Organizer trips
    from app.repositories.user_repository import UserRepository
    user_repo = UserRepository(db)
    curr_user = await user_repo.get_by_id(user_id)
    orig_user = await user_repo.get_by_id(original_trip.owner_id)

    curr_role = getattr(curr_user, "role", None)
    curr_is_org = (curr_role == UserRole.ORGANIZER or str(curr_role).upper() == "ORGANIZER")

    orig_role = getattr(orig_user, "role", None)
    orig_is_org = (orig_role == UserRole.ORGANIZER or str(orig_role).upper() == "ORGANIZER")

    if curr_is_org and not orig_is_org:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Organizers can only copy public organizer tour packages, not personal traveler trips.",
        )
    if not curr_is_org and orig_is_org:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Travelers can only copy other community travelers' public itineraries.",
        )

    new_trip = Trip(
        owner_id=user_id,
        title=f"Customized {original_trip.destination or 'Trip'}",
        destination=original_trip.destination,
        origin=original_trip.origin,
        duration=original_trip.duration,
        travelers=original_trip.travelers,
        budget_total=original_trip.budget_total,
        budget_per_person=original_trip.budget_per_person,
        start_date=original_trip.start_date,
        end_date=original_trip.end_date,
        status=TripStatus.PLANNED,
        preferences=original_trip.preferences or [],
        constraints=original_trip.constraints or [],
        version=1,
        is_public=0,  # Cloned trips start as private
        copied_from_trip_id=original_trip.id,
        image_url=original_trip.image_url,
        advisories=original_trip.advisories or [],
    )
    db.add(new_trip)
    await db.flush()

    owner_member = TripMember(
        trip_id=new_trip.id,
        user_id=user_id,
        role=MemberRole.OWNER,
        invitation_status="ACCEPTED",
    )
    db.add(owner_member)

    if original_trip.itinerary:
        new_itin = Itinerary(
            trip_id=new_trip.id,
            version=1,
            notes=original_trip.itinerary.notes,
        )
        db.add(new_itin)
        await db.flush()

        for old_day in original_trip.itinerary.days:
            new_day = Day(
                itinerary_id=new_itin.id,
                day_number=old_day.day_number,
                title=old_day.title,
                summary=old_day.summary,
            )
            db.add(new_day)
            await db.flush()

            for old_act in old_day.activities:
                new_act = Activity(
                    day_id=new_day.id,
                    order=old_act.order,
                    title=old_act.title,
                    description=old_act.description,
                    location=old_act.location,
                    start_time=old_act.start_time,
                    end_time=old_act.end_time,
                    duration_minutes=old_act.duration_minutes,
                    estimated_cost=old_act.estimated_cost,
                    category=old_act.category,
                )
                db.add(new_act)

    await db.commit()
    return {
        "id": new_trip.id,
        "trip": _format_trip_response(new_trip),
        "message": "Trip successfully copied to your personal workspace for custom editing!",
    }


# ─── REPLANNING & MEMBERS ─────────────────────────────────────────────────
@router.post("/{trip_id}/replan", response_model=ReplanResponse)
async def replan_trip(
    trip_id: str,
    req: ReplanRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Dynamic replanning endpoint: adjusts budget, accommodations, transport without full regen."""
    service = TripService(db)
    trip = await service.get_trip(trip_id=trip_id, user_id=user_id)
    if trip.owner_id != user_id:
        raise HTTPException(status_code=403, detail="Security Alert: Only the trip creator can replan this trip.")

    trip_state = await service.to_trip_state(trip)
    trip_state_dict = trip_state.model_dump()

    new_budget_pp = None
    msg_l = req.message.lower()
    current_pp = trip.budget_per_person or ((trip.budget_total or 20000.0) / max(1, trip.travelers))

    if req.changes and "budget_per_person" in req.changes:
        new_budget_pp = float(req.changes["budget_per_person"])
    elif req.changes and "budget_total" in req.changes:
        new_budget_pp = float(req.changes["budget_total"]) / max(1, trip.travelers)
    else:
        import re
        b_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:k|thousand|hazar)?\b", msg_l)
        if b_match:
            val = float(b_match.group(1))
            if "k" in msg_l or val < 500:
                val *= 1000
            # If user said "5k cheaper" or "make it 2000 cheaper"
            if any(w in msg_l for w in ["cheaper", "kam", "cut", "less", "minus", "discount"]):
                new_budget_pp = max(2000.0, current_pp - val)
            else:
                new_budget_pp = val
        elif any(w in msg_l for w in ["cheap", "kam", "budget", "cut", "save", "economical", "sasta", "low"]):
            new_budget_pp = max(2000.0, current_pp * 0.8)
        elif any(w in msg_l for w in ["luxury", "upgrade", "premium", "deluxe", "expand", "vip"]):
            new_budget_pp = current_pp * 1.3
        else:
            new_budget_pp = max(2000.0, current_pp * 0.85)

    updated_state, changes, totals = ReplannerAgent.replan_budget(
        current_trip_state=trip_state_dict,
        new_budget_per_person=new_budget_pp,
        reason=req.message,
    )

    trip.budget_per_person = updated_state["budget_per_person"]
    trip.budget_total = updated_state["budget_total"]
    trip.version = updated_state["version"]
    await service.repo.update(trip)

    # Strict Budget Reconciliation for all Day Activities & Budgets
    await reconcile_trip_activity_costs(db, trip.id, trip.budget_total)

    await db.commit()

    return ReplanResponse(
        old_version=totals["old_version"],
        new_version=totals["new_version"],
        changes=changes,
        old_total=totals["old_total"],
        new_total=totals["new_total"],
        message=f"Trip updated to Rs. {new_budget_pp:,.0f} per person with optimized allocations.",
    )


@router.post("/{trip_id}/members", status_code=status.HTTP_201_CREATED)
async def add_trip_member(
    trip_id: str,
    req: TripMemberAdd,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    service = TripService(db)
    member = await service.add_member(
        trip_id=trip_id,
        current_user_id=user_id,
        new_user_id=req.user_id,
        role=req.role,
    )
    return {
        "id": member.id,
        "trip_id": member.trip_id,
        "user_id": member.user_id,
        "role": member.role.value if hasattr(member.role, 'value') else member.role,
        "invitation_status": member.invitation_status,
    }


@router.post("/{trip_id}/organizer-match", response_model=List[OrganizerMatchResult])
async def match_organizers_for_trip(
    trip_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    trip_service = TripService(db)
    marketplace_service = MarketplaceService(db)
    trip = await trip_service.get_trip(trip_id=trip_id, user_id=user_id)
    match_req = OrganizerMatchRequest(
        destination=trip.destination,
        budget_per_person=trip.budget_per_person,
        travelers=trip.travelers,
        duration=trip.duration,
        preferences=trip.preferences or [],
    )
    return await marketplace_service.match_organizers(match_req)


@router.delete("/{trip_id}", status_code=status.HTTP_200_OK)
async def delete_trip(
    trip_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Delete a user-owned trip plan with Security Check."""
    trip_service = TripService(db)
    trip = await trip_service.get_trip(trip_id=trip_id, user_id=user_id)
    if trip.owner_id != user_id:
        raise HTTPException(status_code=403, detail="Security Alert: Only the trip owner can delete this trip.")
    await trip_service.delete_trip(trip_id=trip_id, user_id=user_id)
    return {"message": "Trip successfully deleted."}
