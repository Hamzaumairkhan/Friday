"""Itinerary service for creating and structuring days/activities."""

from typing import Dict, Any, List
from app.schemas.itinerary import ItineraryResponse, DaySchema, ActivitySchema
from app.models.itinerary import ActivityCategory
from app.core.logging import get_logger

logger = get_logger("services.itinerary")


class ItineraryService:
    """Builds and serializes structured multi-day itineraries."""

    @classmethod
    def generate_default_itinerary(
        cls,
        trip_id: str,
        destination: str,
        duration: int,
        places: List[Dict[str, Any]],
        hotels: List[Dict[str, Any]],
        version: int = 1,
    ) -> Dict[str, Any]:
        """Generate structured day-by-day itinerary mapped to research data."""
        days = []
        hotel_name = hotels[0]["name"] if hotels else f"{destination} Recommended Hotel"

        for day_num in range(1, duration + 1):
            day_activities = []
            if day_num == 1:
                # Arrival Day
                day_activities.append({
                    "order": 1,
                    "title": f"Departure & Scenic Drive to {destination}",
                    "description": f"Depart early via Karakoram Highway or motorway. Enjoy scenic stops and mountain vistas.",
                    "location": destination,
                    "start_time": "06:00 AM",
                    "end_time": "02:00 PM",
                    "duration_minutes": 480,
                    "estimated_cost": 2500,
                    "category": ActivityCategory.TRANSPORT.value,
                    "confidence": 0.95,
                    "notes": "Carry motion sickness pills if sensitive to mountain turns.",
                })
                day_activities.append({
                    "order": 2,
                    "title": f"Hotel Check-in at {hotel_name}",
                    "description": "Rest, unpack, and acclimatize to the altitude.",
                    "location": hotel_name,
                    "start_time": "02:30 PM",
                    "end_time": "04:30 PM",
                    "duration_minutes": 120,
                    "estimated_cost": 0,
                    "category": ActivityCategory.ACCOMMODATION.value,
                    "confidence": 0.95,
                    "notes": "Tea and refreshments provided.",
                })
                # First attraction
                first_place = places[0]["name"] if places else "Local Bazar Walk"
                day_activities.append({
                    "order": 3,
                    "title": f"Evening Sunset Walk at {first_place}",
                    "description": f"Short walk and photography during golden hour.",
                    "location": first_place,
                    "start_time": "05:00 PM",
                    "end_time": "07:30 PM",
                    "duration_minutes": 150,
                    "estimated_cost": 500,
                    "category": ActivityCategory.SIGHTSEEING.value,
                    "confidence": 0.9,
                    "notes": "Dress warmly for dropping evening temperatures.",
                })
                day_title = f"Day 1: Arrival & Evening Exploration in {destination}"
                day_summary = f"Arrival, check-in at {hotel_name}, and relaxing sunset experience."

            elif day_num == duration:
                # Departure Day
                day_activities.append({
                    "order": 1,
                    "title": "Souvenir & Dry Fruit Shopping in Main Bazar",
                    "description": "Buy famous local organic dried apricots, walnuts, and traditional handicrafts.",
                    "location": f"{destination} Main Market",
                    "start_time": "08:30 AM",
                    "end_time": "10:30 AM",
                    "duration_minutes": 120,
                    "estimated_cost": 1500,
                    "category": ActivityCategory.SHOPPING.value,
                    "confidence": 0.95,
                    "notes": "Bargaining is polite and common.",
                })
                day_activities.append({
                    "order": 2,
                    "title": "Return Journey to Origin",
                    "description": "Safe travel back with lasting mountain memories.",
                    "location": "En-route",
                    "start_time": "11:00 AM",
                    "end_time": "08:00 PM",
                    "duration_minutes": 540,
                    "estimated_cost": 2500,
                    "category": ActivityCategory.TRANSPORT.value,
                    "confidence": 0.95,
                    "notes": "Lunch stop scheduled mid-way.",
                })
                day_title = f"Day {day_num}: Souvenir Shopping & Departure"
                day_summary = "Morning market visit followed by the return journey."

            else:
                # Middle full exploration days
                idx = (day_num - 2) * 2 + 1
                place1 = places[idx % len(places)]["name"] if places else f"Valley Exploration Part {day_num}"
                place2 = places[(idx + 1) % len(places)]["name"] if places else f"Adventure Trek {day_num}"

                day_activities.append({
                    "order": 1,
                    "title": f"Morning Expedition to {place1}",
                    "description": f"Explore {place1} with breathtaking scenery and photography spots.",
                    "location": place1,
                    "start_time": "09:00 AM",
                    "end_time": "01:00 PM",
                    "duration_minutes": 240,
                    "estimated_cost": 1000,
                    "category": ActivityCategory.SIGHTSEEING.value,
                    "confidence": 0.9,
                    "notes": "Comfortable hiking boots recommended.",
                })
                day_activities.append({
                    "order": 2,
                    "title": f"Traditional Lunch & Tea",
                    "description": "Enjoy freshly cooked local specialties.",
                    "location": f"Near {place1}",
                    "start_time": "01:00 PM",
                    "end_time": "02:30 PM",
                    "duration_minutes": 90,
                    "estimated_cost": 1200,
                    "category": ActivityCategory.FOOD.value,
                    "confidence": 0.95,
                    "notes": "Try the signature local stew or trout.",
                })
                day_activities.append({
                    "order": 3,
                    "title": f"Afternoon Visit to {place2}",
                    "description": f"Adventure and guided walk around {place2}.",
                    "location": place2,
                    "start_time": "03:00 PM",
                    "end_time": "06:30 PM",
                    "duration_minutes": 210,
                    "estimated_cost": 800,
                    "category": ActivityCategory.ADVENTURE.value,
                    "confidence": 0.9,
                    "notes": "Camera battery backup recommended.",
                })
                day_title = f"Day {day_num}: {place1} & {place2}"
                day_summary = f"Full day exploration covering {place1} and {place2}."

            days.append({
                "day_number": day_num,
                "title": day_title,
                "summary": day_summary,
                "activities": day_activities,
            })

        return {
            "trip_id": trip_id,
            "version": version,
            "notes": f"Tailored itinerary for {duration} days in {destination}.",
            "days": days,
        }
