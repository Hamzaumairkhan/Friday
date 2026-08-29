import asyncio
import os
import sys

# Set up python path for backend
sys.path.insert(0, r"e:\Hackathons\Alibaba Ai hackathon ~Friday\backend")

from app.services.dynamic_research_service import DynamicDestinationResearchService

async def main():
    dest = "Shounter Pass"
    origin = "Islamabad"
    print(f"=== Testing Dynamic Research for: '{dest}' ===")
    
    days, hero_img = await DynamicDestinationResearchService.generate_dynamic_itinerary_days(
        destination=dest,
        origin=origin,
        duration_days=3,
        budget_total=25000,
        accommodation_preference="comfortable"
    )
    
    print(f"\nHero Image Retrieved: {hero_img}")
    print(f"Generated {len(days)} Days of dynamically researched itinerary:")
    
    for d in days:
        print(f"\n--- Day {d['day_number']}: {d['title']} ---")
        print(f"Summary: {d['summary']}")
        for act in d['activities']:
            print(f"  [{act['start_time']} - {act['end_time']}] {act['title']} ({act['category']})")
            print(f"    Location: {act['location']}")
            print(f"    Map URL: {act['map_url']}")
            print(f"    Image: {act.get('image_url')}")

if __name__ == "__main__":
    asyncio.run(main())
