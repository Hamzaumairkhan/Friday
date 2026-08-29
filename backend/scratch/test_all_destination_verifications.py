import asyncio
import sys
import os

# Add backend directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.dynamic_research_service import DynamicDestinationResearchService, make_maps_url

async def run_test(dest: str, origin: str, days: int, budget: float, label: str):
    print(f"\n=======================================================")
    print(f"=== {label}: Destination = '{dest}' ===")
    print(f"=======================================================")
    
    # 1. Test live dynamic POI research & image matching
    itinerary_days, hero_img = await DynamicDestinationResearchService.generate_dynamic_itinerary_days(
        destination=dest,
        origin=origin,
        duration_days=days,
        budget_total=budget,
        accommodation_preference="comfortable"
    )
    
    print(f"[*] Researched Hero Image: {hero_img}")
    print(f"[*] Total Days Generated: {len(itinerary_days)}")
    
    for day in itinerary_days:
        print(f"\n  --- Day {day['day_number']}: {day['title']} ---")
        print(f"  Summary: {day['summary']}")
        for act in day['activities']:
            img_status = "[REAL WEB IMAGE]" if act.get('image_url', '').startswith('http') else "[LOCAL HIGH-RES]"
            print(f"    [{act['start_time']} - {act['end_time']}] {act['title']} ({act['category']})")
            print(f"      Location: {act['location']}")
            print(f"      Map URL : {act['map_url']}")
            print(f"      Image   : {act.get('image_url')} {img_status}")
            
    # Verify slot options for this destination
    slots = DynamicDestinationResearchService.get_slot_options(dest)
    print(f"\n[*] Dynamic Hourly Slot Options for '{dest}':")
    print(f"  Morning Options   : {[opt['title'] for opt in slots['morning']['options']]}")
    print(f"  Afternoon Options : {[opt['title'] for opt in slots['afternoon']['options']]}")
    print(f"  Evening Options   : {[opt['title'] for opt in slots['evening']['options']]}")

    # Verify weather check for this destination
    weather = DynamicDestinationResearchService.check_weather_advisory(dest, "2026-09-15", days)
    print(f"[*] Weather Advisory Status: {weather.get('status')} - {weather.get('message')}")

async def main():
    # TEST A: Islamabad
    await run_test("Islamabad", "Lahore", 3, 40000, "TEST A: Major Capital")
    
    # TEST B: Hunza
    await run_test("Hunza", "Islamabad", 3, 55000, "TEST B: Famous Mountain Valley")
    
    # TEST C: Skardu
    await run_test("Skardu", "Islamabad", 3, 60000, "TEST C: Alpine Wilderness")
    
    # TEST D: Custom Destination (e.g. Kumrat Valley / Shounter Pass)
    await run_test("Kumrat Valley", "Islamabad", 3, 45000, "TEST D: Custom / Unknown Destination")

if __name__ == "__main__":
    asyncio.run(main())
