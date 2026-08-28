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
from app.models.user import User
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
from app.agents.replanner_agent import ReplannerAgent
from app.core.security import get_current_user_id
from app.core.logging import get_logger

logger = get_logger("api.trips")
router = APIRouter(prefix="/trips", tags=["Trips"])


def _resolve_destination_image(destination: Optional[str]) -> str:
    if not destination:
        return "/images/stitch/stitch_asset_11.jpg"
    
    d = destination.lower()
    if "hunza" in d or "passu" in d or "karakoram" in d or "altit" in d or "baltit" in d:
        return "/images/stitch/stitch_asset_6.jpg"
    elif "skardu" in d or "deosai" in d or "shangrila" in d or "basho" in d or "katpana" in d or "khaplu" in d:
        return "/images/stitch/stitch_asset_11.jpg"
    elif "swat" in d or "kalam" in d or "malam" in d or "mahudand" in d or "miandam" in d:
        return "/images/stitch/stitch_asset_10.jpg"
    elif "fairy" in d or "nanga" in d or "raikot" in d or "beyal" in d:
        return "/images/stitch/stitch_asset_7.jpg"
    elif "kumrat" in d or "jahaz" in d or "dir" in d or "katora" in d:
        return "/images/stitch/stitch_asset_8.jpg"
    elif "naran" in d or "kaghan" in d or "saif" in d or "babusar" in d or "shogran" in d or "siri" in d:
        return "/images/stitch/stitch_asset_9.jpg"
    elif "neelum" in d or "kashmir" in d or "ratti" in d or "arang" in d or "keran" in d or "sharda" in d:
        return "/images/stitch/stitch_asset_10.jpg"
    elif "chitral" in d or "kalash" in d or "shandur" in d or "bumburet" in d:
        return "/images/stitch/stitch_asset_6.jpg"
    elif "attabad" in d or "gulmit" in d or "hussaini" in d:
        return "/images/stitch/stitch_asset_6.jpg"
    elif "lahore" in d or "badshahi" in d:
        return "/images/stitch/stitch_asset_2.jpg"
    elif "islamabad" in d or "margalla" in d or "faisal" in d:
        return "/images/stitch/stitch_asset_4.jpg"
    elif "gwadar" in d or "karachi" in d or "kund" in d or "ormara" in d or "hingol" in d:
        return "/images/stitch/stitch_asset_5.jpg"
    return "/images/stitch/stitch_asset_11.jpg"


async def _fetch_web_images_and_research(destination: str, origin: str) -> tuple[str, list[str]]:
    """Live web search to find real photography and scenic web images for the exact destination."""
    settings = get_settings()
    api_key = getattr(settings, "TAVILY_API_KEY", None)
    real_images: list[str] = []

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
                    real_images.append(img)
            logger.info(f"Retrieved {len(real_images)} real web images for {destination} via Tavily")
        except Exception as e:
            logger.warning(f"Tavily web image retrieval failed for {destination}: {e}")

    # Fallback to scenic photo library if web search did not find direct image tags
    if not real_images:
        fallback_hero = _resolve_destination_image(destination)
        real_images = [
            fallback_hero,
            "/images/stitch/stitch_asset_6.jpg",
            "/images/stitch/stitch_asset_2.jpg",
            "/images/stitch/stitch_asset_7.jpg",
            "/images/stitch/stitch_asset_11.jpg",
            "/images/stitch/stitch_asset_10.jpg",
        ]

    hero_img = real_images[0]
    return hero_img, real_images


def _format_trip_response(t) -> TripResponse:
    img = getattr(t, 'image_url', None) or _resolve_destination_image(t.destination)
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
        copied_from_trip_id=t.copied_from_trip_id if hasattr(t, 'copied_from_trip_id') else None,
        image_url=img,
        advisories=t.advisories or [] if hasattr(t, 'advisories') else [],
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


@router.get("/{trip_id}", response_model=TripResponse)
async def get_trip(
    trip_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    service = TripService(db)
    trip = await service.get_trip(trip_id=trip_id, user_id=user_id)
    return _format_trip_response(trip)


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
    dest = (req.destination_query or "Hunza Valley").strip()
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

    # Helper to safely pick web image
    def get_web_img(idx: int, fallback_cat: str) -> str:
        if web_images and len(web_images) > idx:
            return web_images[idx]
        return _resolve_destination_image(dest)

    # 5. Build Day-by-Day structured schedule with exact time blocks
    days_data = []
    for day_idx in range(1, duration_days + 1):
        if day_idx == 1:
            day_title = f"Departure from {origin} & Arrival in {dest}"
            day_summary = f"Scenic highway transit from {origin}, mountain approach, check-in, and evening orientation in {dest}."
            activities = [
                {
                    "order": 1,
                    "title": f"Departure & Scenic Transit from {origin}",
                    "description": f"Depart from {origin} via motorway and scenic connecting mountain bypass to {dest}.",
                    "location": f"{origin} / Motorway",
                    "start_time": "06:00 AM",
                    "end_time": "10:30 AM",
                    "duration_minutes": 270,
                    "estimated_cost": budget_total * 0.12,
                    "category": ActivityCategory.TRANSPORT,
                    "image_url": get_web_img(0, "transport"),
                },
                {
                    "order": 2,
                    "title": "Traditional Riverside Brunch",
                    "description": f"Fresh local bread, chai, and regional breakfast en-route to {dest}.",
                    "location": f"En-route to {dest}",
                    "start_time": "11:00 AM",
                    "end_time": "12:30 PM",
                    "duration_minutes": 90,
                    "estimated_cost": budget_total * 0.04,
                    "category": ActivityCategory.FOOD,
                    "image_url": get_web_img(1, "food"),
                },
                {
                    "order": 3,
                    "title": f"Arrival & Valley Check-In",
                    "description": f"Arrive in {dest}, lodge orientation, and refreshing rest.",
                    "location": dest,
                    "start_time": "03:00 PM",
                    "end_time": "05:00 PM",
                    "duration_minutes": 120,
                    "estimated_cost": budget_total * 0.10 if req.accommodation_preference != "none" else 0,
                    "category": ActivityCategory.ACCOMMODATION,
                    "image_url": get_web_img(2, "hotel"),
                },
                {
                    "order": 4,
                    "title": "Golden Hour Sunset Walk",
                    "description": f"Leisurely sunset walk along the {dest} valley edge with panoramic mountain views.",
                    "location": f"{dest} Viewpoint",
                    "start_time": "05:30 PM",
                    "end_time": "07:00 PM",
                    "duration_minutes": 90,
                    "estimated_cost": 0,
                    "category": ActivityCategory.SIGHTSEEING,
                    "image_url": get_web_img(3, "viewpoint"),
                },
                {
                    "order": 5,
                    "title": "Local Cuisine & Welcome Dinner",
                    "description": f"Authentic regional dinner in {dest} and relaxing evening stargazing.",
                    "location": f"{dest} Town",
                    "start_time": "07:30 PM",
                    "end_time": "09:30 PM",
                    "duration_minutes": 120,
                    "estimated_cost": budget_total * 0.05,
                    "category": ActivityCategory.FOOD,
                    "image_url": get_web_img(1, "food"),
                },
            ]
        elif day_idx == duration_days:
            day_title = f"Morning Vistas & Return to {origin}"
            day_summary = f"Sunrise mountain views in {dest}, handicraft souvenir bazaar walk, and comfortable return journey back to {origin}."
            activities = [
                {
                    "order": 1,
                    "title": "Sunrise Mountain Breakfast",
                    "description": f"Morning breakfast in {dest} with 360-degree mountain peaks bathed in golden sunlight.",
                    "location": f"{dest} Lodge",
                    "start_time": "07:30 AM",
                    "end_time": "09:00 AM",
                    "duration_minutes": 90,
                    "estimated_cost": budget_total * 0.03,
                    "category": ActivityCategory.FOOD,
                    "image_url": get_web_img(1, "food"),
                },
                {
                    "order": 2,
                    "title": "Local Artisan & Souvenir Walk",
                    "description": f"Visit local dry fruit shops, authentic woolen shawls, and handmade crafts in {dest}.",
                    "location": f"{dest} Bazaar",
                    "start_time": "09:30 AM",
                    "end_time": "11:30 AM",
                    "duration_minutes": 120,
                    "estimated_cost": budget_total * 0.03,
                    "category": ActivityCategory.SHOPPING,
                    "image_url": get_web_img(4, "shopping"),
                },
                {
                    "order": 3,
                    "title": f"Return Transit to {origin}",
                    "description": f"Depart {dest} for return journey back to {origin} with highway photography and lunch rest stops.",
                    "location": f"Return Highway to {origin}",
                    "start_time": "12:00 PM",
                    "end_time": "06:00 PM",
                    "duration_minutes": 360,
                    "estimated_cost": budget_total * 0.10,
                    "category": ActivityCategory.TRANSPORT,
                    "image_url": get_web_img(0, "transport"),
                },
            ]
        else:
            day_title = f"Day {day_idx}: Highlights & Wilderness of {dest}"
            day_summary = f"Full day exploring pristine natural sights, valley treks, local culture, and photographic viewpoints across {dest}."
            activities = [
                {
                    "order": 1,
                    "title": f"Morning Alpine Trail / Jeep Safari in {dest}",
                    "description": f"Early morning 4x4 jeep trek to upper high-altitude viewpoints across {dest}.",
                    "location": f"Upper {dest}",
                    "start_time": "08:00 AM",
                    "end_time": "11:30 AM",
                    "duration_minutes": 210,
                    "estimated_cost": budget_total * 0.06,
                    "category": ActivityCategory.ADVENTURE,
                    "image_url": get_web_img(day_idx % len(web_images) if web_images else 0, "adventure"),
                },
                {
                    "order": 2,
                    "title": "Local Trout / Regional Lunch",
                    "description": f"Fresh organic mountain lunch by the {dest} glacial stream.",
                    "location": f"{dest} Riverside",
                    "start_time": "12:30 PM",
                    "end_time": "02:00 PM",
                    "duration_minutes": 90,
                    "estimated_cost": budget_total * 0.04,
                    "category": ActivityCategory.FOOD,
                    "image_url": get_web_img(1, "food"),
                },
                {
                    "order": 3,
                    "title": f"Historical Heritage & Cultural Immersion",
                    "description": f"Explore centuries-old architecture, community heritage, and botanical orchards in {dest}.",
                    "location": f"{dest} Heritage Site",
                    "start_time": "02:30 PM",
                    "end_time": "05:00 PM",
                    "duration_minutes": 150,
                    "estimated_cost": budget_total * 0.03,
                    "category": ActivityCategory.CULTURE,
                    "image_url": get_web_img(3, "culture"),
                },
                {
                    "order": 4,
                    "title": "Sunset Viewpoint Photography",
                    "description": f"Prime photography session with sunset glow illuminating snowy mountain ridges in {dest}.",
                    "location": f"{dest} Plateau",
                    "start_time": "05:30 PM",
                    "end_time": "07:00 PM",
                    "duration_minutes": 90,
                    "estimated_cost": 0,
                    "category": ActivityCategory.SIGHTSEEING,
                    "image_url": get_web_img(2, "sunset"),
                },
                {
                    "order": 5,
                    "title": "Bonfire & Traditional Dinner",
                    "description": f"Outdoor campfire, local folk music, and warm traditional dinner in {dest}.",
                    "location": f"{dest} Camp / Lodge",
                    "start_time": "07:30 PM",
                    "end_time": "09:30 PM",
                    "duration_minutes": 120,
                    "estimated_cost": budget_total * 0.05,
                    "category": ActivityCategory.FOOD,
                    "image_url": get_web_img(1, "food"),
                },
            ]
        days_data.append({"day_number": day_idx, "title": day_title, "summary": day_summary, "activities": activities})

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
        status=TripStatus.PLANNED,
        preferences=traveler_metadata,
        constraints=[req.additional_preferences] if req.additional_preferences else [],
        version=1,
        is_public=0,
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

    # Create Days & Activities
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
                category=a_data["category"],
                image_url=a_data.get("image_url"),
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

    # 8. Automated Dispatch to Lead & Companions via WhatsApp (Tool-Calling Layer)
    trip_url = f"http://localhost:5173/trips/{trip.id}"
    lead_name = (req.lead_contact or {}).get("name", "Traveler")
    
    wa_msg = (
        f"🌄 *FRIDAY® AI TRIP PLANNER — ITINERARY DISPATCH*\n\n"
        f"Assalam-o-Alaikum! Your AI-crafted itinerary for *{dest}* is ready.\n\n"
        f"📍 *Destination*: {dest}\n"
        f"⏳ *Duration*: {duration_days} Days\n"
        f"👥 *Travelers*: {travelers} People\n"
        f"💰 *Budget Estimate*: PKR {budget_total:,.0f}\n"
        f"🏨 *Stay*: {req.accommodation_preference.replace('_', ' ').title()}\n\n"
        f"🔗 *View & Customize Your Trip*:\n{trip_url}\n\n"
        f"— *Friday® Travel AI Copilot*"
    )

    whatsapp_service = WhatsAppService()
    # Dispatch to Lead Traveler
    lead_phone = (req.lead_contact or {}).get("phone")
    if lead_phone:
        try:
            await whatsapp_service.send_message(to_number=lead_phone, message=wa_msg)
            logger.info(f"Dispatched WhatsApp trip itinerary to Lead Traveler: {lead_phone}")
        except Exception as e:
            logger.warning(f"Failed to send WhatsApp to lead traveler: {e}")

    # Dispatch to each Companion
    for comp in (req.companions or []):
        comp_phone = comp.get("phone")
        comp_name = comp.get("name", "Traveler")
        if comp_phone:
            comp_msg = (
                f"🌄 *FRIDAY® AI TRIP PLANNER — GROUP INVITATION*\n\n"
                f"Assalam-o-Alaikum {comp_name}! {lead_name} has planned an expedition to *{dest}* ({duration_days} Days) with you!\n\n"
                f"📍 *Destination*: {dest}\n"
                f"👥 *Travelers*: {travelers} People\n"
                f"💰 *Total Group Budget*: PKR {budget_total:,.0f}\n\n"
                f"🔗 *Open Group Trip Link*:\n{trip_url}\n\n"
                f"— *Friday® Travel AI Copilot*"
            )
            try:
                await whatsapp_service.send_message(to_number=comp_phone, message=comp_msg)
                logger.info(f"Dispatched WhatsApp group invite to Companion {comp_name}: {comp_phone}")
            except Exception as e:
                logger.warning(f"Failed to send WhatsApp to companion: {e}")

    # 9. Automated Email Dispatch to Lead & Companions (Tool-Calling Layer)
    email_service = EmailService()
    lead_email = (req.lead_contact or {}).get("email")
    if lead_email:
        try:
            await email_service.send_itinerary(
                trip_id=trip.id,
                traveler_email=lead_email,
                traveler_name=lead_name,
                destination=dest,
                duration=duration_days,
                itinerary_days=days_data,
                budget_summary=budget_breakdown,
            )
            logger.info(f"Dispatched email trip itinerary to Lead Traveler: {lead_email}")
        except Exception as e:
            logger.warning(f"Failed to send email to lead traveler: {e}")

    for comp in (req.companions or []):
        comp_email = comp.get("email")
        comp_name = comp.get("name", "Traveler")
        if comp_email:
            try:
                await email_service.send_itinerary(
                    trip_id=trip.id,
                    traveler_email=comp_email,
                    traveler_name=comp_name,
                    destination=dest,
                    duration=duration_days,
                    itinerary_days=days_data,
                    budget_summary=budget_breakdown,
                )
                logger.info(f"Dispatched group itinerary email to companion {comp_name}: {comp_email}")
            except Exception as e:
                logger.warning(f"Failed to send email to companion: {e}")

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
