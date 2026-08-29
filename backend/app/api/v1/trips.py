"""Trips API endpoints with complete Guided AI Trip Planner, Security Controls, Dynamic Images, and Public/Private sharing."""

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
    fetch_real_web_photo,
    resolve_regional_fallback_image,
)
from app.agents.replanner_agent import ReplannerAgent
from app.core.security import get_current_user_id
from app.core.logging import get_logger

logger = get_logger("api.trips")
router = APIRouter(prefix="/trips", tags=["Trips"])


def _resolve_destination_image(destination: Optional[str]) -> str:
    if not destination:
        return "/images/stitch/panoramic_lake.jpg"
    
    # 1. Try real web photo
    real_photo = fetch_real_web_photo(destination)
    if real_photo:
        return real_photo

    # 2. Regional fallback (clean, unbranded)
    return resolve_regional_fallback_image(destination)


async def _fetch_web_images_and_research(destination: str, origin: str) -> tuple[str, list[str]]:
    """Live web search to find real photography and scenic web images for the exact destination."""
    real_images: list[str] = []

    # 1. Primary: High-definition real web photo of destination
    direct_photo = fetch_real_web_photo(destination, destination)
    if direct_photo:
        real_images.append(direct_photo)

    # 2. Secondary: Tavily Search if active
    settings = get_settings()
    api_key = getattr(settings, "TAVILY_API_KEY", None)
    if api_key:
        try:
            from tavily import TavilyClient
            client = TavilyClient(api_key=api_key)
            res = client.search(
                query=f"{destination} Pakistan travel tourism attractions landscape photography",
                include_images=True,
                max_results=8,
                search_depth="basic",
            )
            for img in res.get("images", []):
                if isinstance(img, str) and img.startswith("http") and not img.endswith(".svg"):
                    if img not in real_images:
                        real_images.append(img)
        except Exception:
            pass

    # 3. Fallback to scenic photo library if web search did not find direct image tags
    if not real_images:
        fallback_hero = resolve_regional_fallback_image(destination)
        real_images = [fallback_hero]

    hero_img = real_images[0]
    return hero_img, real_images


def _format_trip_response(t, members_override=None) -> TripResponse:
    img = getattr(t, 'image_url', None) or _resolve_destination_image(t.destination)
    
    members = []
    if members_override is not None:
        members = members_override
    else:
        prefs = t.preferences if isinstance(t.preferences, dict) else {}
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
        copied_from_trip_id=t.copied_from_trip_id if hasattr(t, 'copied_from_trip_id') else None,
        image_url=img,
        advisories=t.advisories or [] if hasattr(t, 'advisories') else [],
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
):
    """Analyze destination weather for selected dates and return optimal suggested dates if risky."""
    return DynamicDestinationResearchService.check_weather_advisory(
        destination=destination,
        departure_date=departure_date,
        duration_days=duration_days,
    )


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

    # 3. Dynamic destination real web image resolution via Tavily / Web Search
    img_url, web_images = await _fetch_web_images_and_research(dest, origin)
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
    if not img_url or img_url.startswith("/images/stitch/"):
        img_url = researched_hero or img_url

    # 6. Compute Deterministic Budget Breakdown
    accom_pct = 0.35 if req.accommodation_preference != "none" else 0.0
    trans_pct = 0.28
    food_pct = 0.20
    act_pct = 0.10
    other_pct = 1.0 - (accom_pct + trans_pct + food_pct + act_pct)

    budget_breakdown = {
        "transport": round(budget_total * trans_pct),
        "accommodation": round(budget_total * accom_pct),
        "food": round(budget_total * food_pct),
        "activities": round(budget_total * act_pct),
        "other": round(budget_total * max(0.05, other_pct)),
        "total": round(budget_total),
    }

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

    trip = Trip(
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
            act_cat = a_data.get("category", "SIGHTSEEING")
            if isinstance(act_cat, str):
                try:
                    act_cat = ActivityCategory[act_cat.upper()]
                except KeyError:
                    act_cat = ActivityCategory.OTHER

            act_obj = Activity(
                day_id=day_obj.id,
                order=a_data["order"],
                title=a_data["title"],
                description=a_data["description"],
                location=a_data["location"],
                start_time=a_data["start_time"],
                end_time=a_data["end_time"],
                duration_minutes=a_data["duration_minutes"],
                estimated_cost=a_data["estimated_cost"],
                category=act_cat,
                image_url=a_data.get("image_url"),
                notes=a_data.get("map_url"),
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
                    "title": a.title,
                    "description": a.description,
                    "location": a.location,
                    "start_time": a.start_time,
                    "end_time": a.end_time,
                    "duration_minutes": a.duration_minutes,
                    "estimated_cost": a.estimated_cost,
                    "category": a.category.value if hasattr(a.category, 'value') else a.category,
                    "map_url": a.notes or make_maps_url(a.location or trip.destination, trip.destination),
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

    # Automated Dispatch to Lead & Companions via WhatsApp and Email
    lead_name = (trip.preferences or {}).get("lead_contact", {}).get("name", "Traveler")
    lead_phone = (trip.preferences or {}).get("lead_contact", {}).get("phone")
    lead_email = (trip.preferences or {}).get("lead_contact", {}).get("email")

    email_service = EmailService()
    whatsapp_service = WhatsAppService()

    trip_url = f"http://localhost:5173/trips/{trip.id}"

    if lead_email:
        try:
            await email_service.send_itinerary(
                trip_id=trip.id,
                traveler_email=lead_email,
                traveler_name=lead_name,
                destination=trip.destination,
                duration=trip.duration,
                itinerary_days=itinerary_days,
                budget_summary=budget_summary,
            )
            logger.info(f"Dispatched email itinerary to {lead_email}")
        except Exception as e:
            logger.warning(f"Failed to send email to lead traveler: {e}")

    for comp in (trip.preferences or {}).get("companions", []):
        comp_email = comp.get("email")
        comp_name = comp.get("name", "Traveler")
        if comp_email:
            try:
                await email_service.send_itinerary(
                    trip_id=trip.id,
                    traveler_email=comp_email,
                    traveler_name=comp_name,
                    destination=trip.destination,
                    duration=trip.duration,
                    itinerary_days=itinerary_days,
                    budget_summary=budget_summary,
                )
            except Exception as e:
                logger.warning(f"Failed to send email to companion {comp_email}: {e}")

    if lead_phone:
        wa_msg = (
            f"🎒 *FRIDAY® EXPEDITION PUBLISHED: {trip.title}*\n\n"
            f"📍 *Destination*: {trip.destination}\n"
            f"📅 *Dates*: {trip.start_date or 'Flexible'} – {trip.end_date or ''}\n"
            f"👥 *Travelers*: {trip.travelers} People\n"
            f"💰 *Total Estimated Budget*: PKR {trip.budget_total:,.0f}\n\n"
            f"🔗 *View Interactive Itinerary & Google Maps*:\n{trip_url}\n\n"
            f"— *Friday® Travel AI Copilot*"
        )
        try:
            await whatsapp_service.send_message(to_number=lead_phone, message=wa_msg)
        except Exception as e:
            logger.warning(f"Failed to send WhatsApp to lead: {e}")

    await db.commit()
    return {
        "trip": _format_trip_response(trip),
        "message": f"Expedition published successfully as {'Public (Shared with Community)' if is_pub else 'Private (Expedition Vault)'}! Itinerary dispatched to email.",
        "is_public": bool(trip.is_public),
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
    try:
        act_cat = ActivityCategory[cat_str.upper()]
    except KeyError:
        act_cat = ActivityCategory.OTHER

    location = payload.get("location", trip.destination)
    map_url = payload.get("map_url") or make_maps_url(location, trip.destination)

    act = Activity(
        day_id=day_id,
        order=int(payload.get("order", 99)),
        title=payload.get("title", "Custom Activity"),
        description=payload.get("description", ""),
        location=location,
        start_time=payload.get("start_time", "10:00 AM"),
        end_time=payload.get("end_time", "12:00 PM"),
        duration_minutes=int(payload.get("duration_minutes", 120)),
        estimated_cost=float(payload.get("estimated_cost", 0)),
        category=act_cat,
        image_url=payload.get("image_url", trip.image_url),
        notes=map_url,
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
        act.location = payload["location"]
        act.notes = payload.get("map_url") or make_maps_url(act.location, trip.destination)
    if "start_time" in payload:
        act.start_time = payload["start_time"]
    if "end_time" in payload:
        act.end_time = payload["end_time"]
    if "duration_minutes" in payload:
        act.duration_minutes = int(payload["duration_minutes"])
    if "estimated_cost" in payload:
        act.estimated_cost = float(payload["estimated_cost"])
    if "category" in payload:
        try:
            act.category = ActivityCategory[payload["category"].upper()]
        except KeyError:
            pass
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

    if original_trip.owner_id == user_id:
        raise HTTPException(status_code=400, detail="You already own this trip. You can directly customize your own itinerary.")

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
    if req.changes and "budget_per_person" in req.changes:
        new_budget_pp = float(req.changes["budget_per_person"])
    elif req.changes and "budget_total" in req.changes:
        new_budget_pp = float(req.changes["budget_total"]) / max(1, trip.travelers)
    else:
        import re
        b_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:k|thousand|hazar)?\b", req.message.lower())
        if b_match:
            val = float(b_match.group(1))
            if "k" in req.message.lower() or val < 500:
                val *= 1000
            new_budget_pp = val
        else:
            new_budget_pp = (trip.budget_per_person or 40000) * 0.75

    updated_state, changes, totals = ReplannerAgent.replan_budget(
        current_trip_state=trip_state_dict,
        new_budget_per_person=new_budget_pp,
        reason=req.message,
    )

    trip.budget_per_person = updated_state["budget_per_person"]
    trip.budget_total = updated_state["budget_total"]
    trip.version = updated_state["version"]
    await service.repo.update(trip)
    await db.commit()

    return ReplanResponse(
        old_version=totals["old_version"],
        new_version=totals["new_version"],
        changes=changes,
        old_total=totals["old_total"],
        new_total=totals["new_total"],
        message=f"Trip successfully replanned for Rs. {new_budget_pp:,.0f} per person.",
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
