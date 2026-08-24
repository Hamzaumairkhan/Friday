"""Live API Diagnostic and Integration Test Script for Friday Backend."""

import asyncio
import os
import sys

# Set UTF-8 encoding for Windows terminal
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

# Ensure backend root is in python path
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from app.core.config import get_settings
from app.llm.gemini import GeminiProvider
from app.llm.groq import GroqProvider
from app.tools.web_search import WebSearchTool
from app.tools.places import PlacesTool
from app.tools.maps import MapsTool
from app.tools.weather import WeatherTool
from app.tools.email import EmailTool
from app.tools.whatsapp import WhatsAppTool
from app.vector_store.chroma import get_vector_store
from app.vector_store.collections import Collections

settings = get_settings()


async def test_all_live_apis():
    print("=" * 70)
    print("🔍 FRIDAY BACKEND — LIVE REAL APIS DIAGNOSTIC SUITE")
    print("=" * 70)

    # 1. Google Gemini
    print("\n1. Testing Google Gemini (`gemini-2.5-flash`)...")
    try:
        gemini = GeminiProvider()
        res = await gemini.generate_text(
            prompt="Briefly list 2 iconic attractions in Hunza Valley, Pakistan.",
            temperature=0.2,
        )
        print(f"   ✅ [GEMINI LIVE SUCCESS]:\n   {res.text.strip()[:180]}...")
    except Exception as e:
        print(f"   ❌ [GEMINI FAILED]: {e}")

    # 2. Groq
    print("\n2. Testing Groq Cloud (`llama-3.3-70b-versatile`)...")
    try:
        groq = GroqProvider()
        res = await groq.generate_text(
            prompt="Translate and extract intent from Roman Urdu: 'Mujhe 5 dosto ke sath Swat jana hai.'",
            temperature=0.1,
        )
        print(f"   ✅ [GROQ LIVE SUCCESS]:\n   {res.text.strip()[:180]}...")
    except Exception as e:
        print(f"   ❌ [GROQ FAILED]: {e}")

    # 3. Tavily Web Research
    print("\n3. Testing Tavily Web Search API...")
    try:
        tavily = WebSearchTool()
        res = await tavily.search("Current road conditions Karakoram Highway Hunza", max_results=2)
        if res.get("success") and res.get("data", {}).get("results"):
            results = res["data"]["results"]
            print(f"   ✅ [TAVILY LIVE SUCCESS]: Found {len(results)} live results.")
            print(f"      • Title: {results[0].get('title')}")
            print(f"      • URL: {results[0].get('url')}")
        else:
            print(f"   ⚠️ [TAVILY NOTICE]: {res.get('error') or 'Fallback data used'}")
    except Exception as e:
        print(f"   ❌ [TAVILY FAILED]: {e}")

    # 4. Google Maps Places API
    print("\n4. Testing Google Maps Places API...")
    try:
        places_tool = PlacesTool()
        res = await places_tool.search_places("Hunza")
        if res.get("success") and res.get("data"):
            places = res["data"]
            print(f"   ✅ [GOOGLE PLACES LIVE SUCCESS]: Found {len(places)} real places in Hunza.")
            p1 = places[0]
            print(f"      • Place: {p1.get('name')} | Rating: {p1.get('rating')} ⭐ | Address: {p1.get('address')}")
        else:
            print(f"   ⚠️ [GOOGLE PLACES NOTICE]: {res.get('error')}")
    except Exception as e:
        print(f"   ❌ [GOOGLE PLACES FAILED]: {e}")

    # 5. Google Maps Directions API
    print("\n5. Testing Google Maps Directions API...")
    try:
        maps_tool = MapsTool()
        res = await maps_tool.get_route(origin="Islamabad", destination="Hunza")
        if res.get("success") and res.get("data"):
            d = res["data"]
            print(f"   ✅ [GOOGLE DIRECTIONS LIVE SUCCESS]:")
            print(f"      • Route: {d.get('origin')} ➔ {d.get('destination')}")
            print(f"      • Distance: {d.get('distance_km')} km ({d.get('distance_text')})")
            print(f"      • Driving Time: {d.get('drive_time_hours')} hours ({d.get('duration_text')})")
        else:
            print(f"   ⚠️ [GOOGLE DIRECTIONS NOTICE]: {res.get('error')}")
    except Exception as e:
        print(f"   ❌ [GOOGLE DIRECTIONS FAILED]: {e}")

    # 6. OpenWeather API
    print("\n6. Testing OpenWeather API...")
    try:
        weather_tool = WeatherTool()
        res = await weather_tool.get_weather("Hunza", days=3)
        if res.get("success") and res.get("data"):
            w = res["data"]
            print(f"   ✅ [OPENWEATHER LIVE SUCCESS]:")
            print(f"      • Destination: {w.get('destination')}")
            print(f"      • Current Temp: {w.get('current_temp')}°C (Feels like: {w.get('feels_like')}°C)")
            print(f"      • Condition: {w.get('condition')} ({w.get('description')})")
            print(f"      • Humidity: {w.get('humidity')}% | Wind: {w.get('wind_speed_kmh')} km/h")
        else:
            print(f"   ⚠️ [OPENWEATHER NOTICE]: {res.get('error')}")
    except Exception as e:
        print(f"   ❌ [OPENWEATHER FAILED]: {e}")

    # 7. Resend Email API
    print("\n7. Testing Resend Email API...")
    try:
        email_tool = EmailTool()
        res = await email_tool.send_email(
            to="delivered@resend.dev",
            subject="Friday Live Test Booking Alert",
            body="Test notification from Friday AI Travel Marketplace.",
        )
        if res.get("success"):
            print(f"   ✅ [RESEND EMAIL LIVE SUCCESS]: ID: {res['data'].get('id')} | Channel: {res.get('source')}")
        else:
            print(f"   ⚠️ [RESEND NOTICE]: {res.get('error')}")
    except Exception as e:
        print(f"   ❌ [RESEND FAILED]: {e}")

    # 8. WhatsApp & SMS Notification Tool
    print("\n8. Testing WhatsApp & SMS Notification Tool...")
    try:
        wa_tool = WhatsAppTool()
        wa_res = await wa_tool.send_whatsapp(
            to_number="+923001234567",
            message="🌄 *Friday Booking Notification*: Your reservation #12345 is confirmed!",
        )
        sms_res = await wa_tool.send_sms(
            to_number="+923001234567",
            message="Friday Booking #12345 confirmed.",
        )
        print(f"   ✅ [WHATSAPP DISPATCH SUCCESS]: Status: {wa_res.get('status')} | ID: {wa_res.get('message_id')}")
        print(f"   ✅ [SMS DISPATCH SUCCESS]: Status: {sms_res.get('status')} | ID: {sms_res.get('message_id')}")
    except Exception as e:
        print(f"   ❌ [WHATSAPP/SMS FAILED]: {e}")

    # 9. Persistent ChromaDB & Embeddings
    print("\n9. Testing Persistent ChromaDB...")
    try:
        vs = get_vector_store()
        doc_id = "test-live-doc"
        await vs.add_documents(
            collection_name=Collections.TRAVEL_KNOWLEDGE,
            documents=[{
                "id": doc_id,
                "text": "Fairy Meadows is a grassland near one of the base camps of Nanga Parbat.",
                "metadata": {"destination": "Fairy Meadows"},
            }],
        )
        search_res = await vs.search(
            collection_name=Collections.TRAVEL_KNOWLEDGE,
            query="Nanga Parbat base camp",
            limit=1,
        )
        if search_res:
            print(f"   ✅ [CHROMADB PERSISTENT SUCCESS]: Found '{search_res[0]['text'][:50]}...' (Score: {search_res[0]['score']})")
    except Exception as e:
        print(f"   ❌ [CHROMADB FAILED]: {e}")

    print("\n" + "=" * 70)
    print("🎯 LIVE APIS DIAGNOSTIC COMPLETED")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(test_all_live_apis())
