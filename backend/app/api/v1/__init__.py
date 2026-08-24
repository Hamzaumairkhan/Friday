"""API v1 router assembly."""

from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.chat import router as chat_router
from app.api.v1.trips import router as trips_router
from app.api.v1.itinerary import router as itinerary_router
from app.api.v1.budget import router as budget_router
from app.api.v1.groups import router as groups_router
from app.api.v1.organizers import router as organizers_router
from app.api.v1.packages import router as packages_router
from app.api.v1.bookings import router as bookings_router

v1_router = APIRouter(prefix="/api/v1")

v1_router.include_router(auth_router)
v1_router.include_router(chat_router)
v1_router.include_router(trips_router)
v1_router.include_router(itinerary_router)
v1_router.include_router(budget_router)
v1_router.include_router(groups_router)
v1_router.include_router(organizers_router)
v1_router.include_router(packages_router)
v1_router.include_router(bookings_router)
