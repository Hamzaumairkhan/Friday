"""Comprehensive 20-Point Smoke Testing Suite for Friday Backend."""

import asyncio
import os
import sys
from pathlib import Path

# Set UTF-8 encoding for Windows terminal
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

# Ensure backend root is on sys.path
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.config import get_settings
from app.database.database import init_db
from app.database.seed import seed_initial_data_async
from app.services.budget_service import BudgetService
from app.tools.weather import WeatherTool
from app.tools.places import PlacesTool
from app.tools.maps import MapsTool
from app.tools.hotels import HotelsTool
from app.tools.restaurants import RestaurantsTool
from app.tools.organizers import OrganizersTool
from app.tools.web_search import WebSearchTool
from app.tools.whatsapp import WhatsAppTool
from app.llm.base import TaskType
from app.llm.router import get_llm_router
from app.graph.workflow import execute_friday_workflow

settings = get_settings()


async def run_comprehensive_smoke_tests():
    print("=" * 80)
    print("🚀 FRIDAY BACKEND — 20-POINT COMPREHENSIVE PRODUCTION SMOKE TEST SUITE")
    print("=" * 80)

    passed = 0
    total = 20

    # 1. Database & Seeding
    print("\n[CHECK 1/20] Database Initialization & Idempotent Seeding...")
    try:
        await init_db()
        await seed_initial_data_async()
        print("   ✅ DB initialized and initial packages/organizers seeded successfully.")
        passed += 1
    except Exception as e:
        print(f"   ❌ DB/Seed failed: {e}")

    # 2. Data directory anchoring check
    print("\n[CHECK 2/20] Database & ChromaDB Anchoring in backend/data/...")
    data_dir = Path(backend_path) / "data"
    db_file = data_dir / "friday.db"
    chroma_dir = data_dir / "chroma"
    if db_file.exists() and chroma_dir.exists():
        print(f"   ✅ Data files anchored strictly in: {data_dir}")
        passed += 1
    else:
        print(f"   ❌ Data directory missing: {data_dir}")

    # 3. HTTP Client Tests
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        auth_headers = {"X-User-Id": "traveler-hamza", "Authorization": "Bearer traveler-hamza"}

        # Check 3: Health Endpoint
        print("\n[CHECK 3/20] Health Diagnostics Endpoint (/health)...")
        res = await client.get("/health")
        if res.status_code == 200 and res.json().get("status") in ("healthy", "degraded"):
            data = res.json()
            print(f"   ✅ Health OK: Status='{data['status']}', DB={data['subsystems']['database']['status']}")
            passed += 1
        else:
            print(f"   ❌ Health check failed: {res.text}")

        # Check 4: User Profile Endpoint
        print("\n[CHECK 4/20] User Identity Context (/api/v1/auth/me)...")
        res = await client.get("/api/v1/auth/me", headers=auth_headers)
        if res.status_code == 200 and res.json().get("id") == "traveler-hamza":
            print(f"   ✅ User Identity OK: '{res.json().get('name')}' ({res.json().get('role')})")
            passed += 1
        else:
            print(f"   ❌ Auth /me failed: {res.text}")

        # Check 5: Trip Creation & Retrieval
        print("\n[CHECK 5/20] Trip Lifecycle (/api/v1/trips)...")
        trip_payload = {
            "title": "Hunza Autumn Expedition",
            "destination": "Hunza",
            "origin": "Islamabad",
            "duration": 4,
            "budget": 80000.0,
            "travelers": 2,
        }
        create_res = await client.post("/api/v1/trips", json=trip_payload, headers=auth_headers)
        if create_res.status_code == 201:
            trip_id = create_res.json()["id"]
            get_res = await client.get(f"/api/v1/trips/{trip_id}", headers=auth_headers)
            if get_res.status_code == 200:
                print(f"   ✅ Trip Created & Retrieved: #{trip_id[:8]} for '{get_res.json()['destination']}'")
                passed += 1
        else:
            print(f"   ❌ Trip failed: {create_res.text}")

        # Check 6: Marketplace Packages Search
        print("\n[CHECK 6/20] Marketplace Packages Query (/api/v1/packages)...")
        pkg_res = await client.get("/api/v1/packages?destination=Hunza")
        if pkg_res.status_code == 200 and len(pkg_res.json()) >= 1:
            pkgs = pkg_res.json()
            selected_pkg = pkgs[0]
            print(f"   ✅ Marketplace returned {len(pkgs)} package(s). Top: '{selected_pkg['title']}'")
            passed += 1
        else:
            print(f"   ❌ Marketplace query failed: {pkg_res.text}")
            selected_pkg = None

        # Check 7: Booking Creation Workflow
        print("\n[CHECK 7/20] Booking Workflow (/api/v1/bookings)...")
        if selected_pkg and 'trip_id' in locals():
            booking_payload = {
                "trip_id": trip_id,
                "package_id": selected_pkg["id"],
                "travelers": 2,
                "notes": "Vegetarian meal preference",
            }
            book_res = await client.post("/api/v1/bookings", json=booking_payload, headers=auth_headers)
            if book_res.status_code in (200, 201):
                booking = book_res.json()
                print(f"   ✅ Booking Created: #{booking['id'][:8]} | Total: Rs. {booking['total_price']:,.0f}")
                passed += 1
            else:
                print(f"   ❌ Booking creation failed: {book_res.text}")

    # Check 8: Deterministic Budget Calculations
    print("\n[CHECK 8/20] Pure Python Deterministic Budget Engine...")
    sample_items = [
        {"category": "TRANSPORTATION", "estimated_amount": 25000.0, "actual_amount": 0.0},
        {"category": "ACCOMMODATION", "estimated_amount": 35000.0, "actual_amount": 0.0},
        {"category": "FOOD", "estimated_amount": 20000.0, "actual_amount": 0.0},
    ]
    summary = BudgetService.calculate_summary(trip_id="trip-123", total_budget_limit=100000.0, budget_items=sample_items, travelers=2)
    if summary.remaining == 20000.0 and summary.total_per_person == 40000.0:
        print(f"   ✅ Budget Math Verified: Total=Rs. {summary.total_estimated:,.0f}, Rem=Rs. {summary.remaining:,.0f}, PP=Rs. {summary.total_per_person:,.0f}")
        passed += 1
    else:
        print(f"   ❌ Budget math failed: {summary}")

    # Check 9: Weather Tool & Source Type
    print("\n[CHECK 9/20] Weather Tool with Source Transparency...")
    try:
        w_tool = WeatherTool()
        w_res = await w_tool.get_weather("Hunza")
        print(f"   ✅ Weather Tool OK: Source='{w_res.get('source')}', Type='{w_res.get('source_type')}'")
        passed += 1
    except Exception as e:
        print(f"   ❌ Weather error: {e}")

    # Check 10: Places Tool & Source Type
    print("\n[CHECK 10/20] Places Tool with Source Transparency...")
    try:
        p_tool = PlacesTool()
        p_res = await p_tool.search_places("Hunza")
        print(f"   ✅ Places Tool OK: Source='{p_res.get('source')}', Type='{p_res.get('source_type')}', Count={p_res.get('count')}")
        passed += 1
    except Exception as e:
        print(f"   ❌ Places error: {e}")

    # Check 11: Maps Tool & Source Type
    print("\n[CHECK 11/20] Maps / Routing Tool with Source Transparency...")
    try:
        m_tool = MapsTool()
        m_res = await m_tool.get_route("Islamabad", "Hunza")
        print(f"   ✅ Maps Tool OK: Source='{m_res.get('source')}', Type='{m_res.get('source_type')}', Distance={m_res['data']['distance_km']} km")
        passed += 1
    except Exception as e:
        print(f"   ❌ Maps error: {e}")

    # Check 12: Hotels Tool & Source Type
    print("\n[CHECK 12/20] Hotels Tool with Source Transparency...")
    try:
        h_tool = HotelsTool()
        h_res = await h_tool.search_hotels("Hunza")
        print(f"   ✅ Hotels Tool OK: Source='{h_res.get('source')}', Type='{h_res.get('source_type')}', Count={h_res.get('count')}")
        passed += 1
    except Exception as e:
        print(f"   ❌ Hotels error: {e}")

    # Check 13: Restaurants Tool & Source Type
    print("\n[CHECK 13/20] Restaurants Tool with Source Transparency...")
    try:
        r_tool = RestaurantsTool()
        r_res = await r_tool.search_restaurants("Hunza")
        print(f"   ✅ Restaurants Tool OK: Source='{r_res.get('source')}', Type='{r_res.get('source_type')}', Count={r_res.get('count')}")
        passed += 1
    except Exception as e:
        print(f"   ❌ Restaurants error: {e}")

    # Check 14: Organizers Tool
    print("\n[CHECK 14/20] Organizers Catalog & Verification Attribution...")
    try:
        o_tool = OrganizersTool()
        o_res = await o_tool.search_organizers("Hunza")
        print(f"   ✅ Organizers Tool OK: Source='{o_res.get('source')}', Type='{o_res.get('source_type')}', Count={len(o_res.get('data', []))}")
        passed += 1
    except Exception as e:
        print(f"   ❌ Organizers error: {e}")

    # Check 15: Web Search Tool
    print("\n[CHECK 15/20] Tavily Web Research Tool...")
    try:
        ws_tool = WebSearchTool()
        ws_res = await ws_tool.search("Hunza Pakistan travel")
        print(f"   ✅ Web Search OK: Source='{ws_res.get('source')}', Type='{ws_res.get('source_type')}'")
        passed += 1
    except Exception as e:
        print(f"   ❌ Web search error: {e}")

    # Check 16: WhatsApp Baileys Tool
    print("\n[CHECK 16/20] Baileys WhatsApp Dispatch Tool...")
    try:
        wa_tool = WhatsAppTool()
        wa_res = await wa_tool.send_whatsapp(to_number="03001234567", message="*Friday Smoke Test*")
        print(f"   ✅ WhatsApp Tool OK: Channel='{wa_res.get('channel')}', Type='{wa_res.get('source_type')}', Status='{wa_res.get('status')}'")
        passed += 1
    except Exception as e:
        print(f"   ❌ WhatsApp error: {e}")

    # Check 17: LLM Router Task Dispatch
    print("\n[CHECK 17/20] LLM Router Architecture (Groq ↔ Gemini)...")
    try:
        router = get_llm_router()
        primary_p, fallback_p, p_name, fb_name = router._get_primary_and_fallback(TaskType.PLANNING)
        print(f"   ✅ LLM Router OK: Planning primary={p_name}, Extraction primary={router._get_primary_and_fallback(TaskType.EXTRACTION)[2]}")
        passed += 1
    except Exception as e:
        print(f"   ❌ LLM router error: {e}")

    # Check 18: LangGraph End-to-End Workflow
    print("\n[CHECK 18/20] LangGraph Multi-Agent Trip Planning Workflow...")
    try:
        g_res = await execute_friday_workflow(
            user_message="Plan a 4-day Hunza trip for 2 people with 40k budget each",
            user_id="smoke-test-traveler",
        )
        print(f"   ✅ LangGraph Workflow Executed: Intent='{g_res.get('intent')}', Actions={len(g_res.get('actions_taken', []))}")
        passed += 1
    except Exception as e:
        print(f"   ❌ LangGraph workflow error: {e}")

    # Check 19: Dynamic Replanning Chain
    print("\n[CHECK 19/20] Dynamic Replanning Chain...")
    try:
        initial_trip = g_res.get("trip_state")
        replan_res = await execute_friday_workflow(
            user_message="Budget kam karke 30000 kardo",
            user_id="smoke-test-traveler",
            trip_state=initial_trip,
        )
        if replan_res.get("intent") == "replan_budget":
            print(f"   ✅ Dynamic Replanning OK: New Budget=Rs. {replan_res['trip_state']['budget_per_person']:,.0f}/person (v{replan_res['trip_state']['version']})")
            passed += 1
        else:
            print(f"   ❌ Replanning intent mismatch: {replan_res.get('intent')}")
    except Exception as e:
        print(f"   ❌ Replanning error: {e}")

    # Check 20: Persistent ChromaDB Vector Store
    print("\n[CHECK 20/20] Persistent ChromaDB Vector Store...")
    try:
        from app.vector_store.chroma import get_vector_store
        from app.vector_store.collections import Collections
        vs = get_vector_store()
        res = await vs.search(Collections.TRAVEL_KNOWLEDGE, query="Hunza trekking", limit=1)
        print(f"   ✅ ChromaDB Vector Search Active: Retrieved {len(res)} item(s).")
        passed += 1
    except Exception as e:
        print(f"   ❌ ChromaDB error: {e}")

    # Final Summary
    print("\n" + "=" * 80)
    print(f"🎯 SMOKE TEST SUMMARY: {passed} / {total} CHECKS PASSED ({int(passed/total*100)}%)")
    print("=" * 80)

    return passed == total


if __name__ == "__main__":
    success = asyncio.run(run_comprehensive_smoke_tests())
    sys.exit(0 if success else 1)
