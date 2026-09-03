"""Tests for provider-independent research tools & Resend Email tool."""

import pytest
from app.tools.weather import WeatherTool
from app.tools.maps import MapsTool
from app.tools.places import PlacesTool
from app.tools.hotels import HotelsTool
from app.tools.restaurants import RestaurantsTool
from app.tools.organizers import OrganizersTool
from app.tools.web_search import WebSearchTool
from app.tools.email import EmailTool
from app.models.organizer import Organizer


def test_weather_tool(run_async):
    async def _test():
        tool = WeatherTool()
        res = await tool.get_weather("Hunza", days=4)
        assert "source_type" in res
        if res["success"]:
            assert res["source_type"] == "live"
            data = res["data"]
            assert "destination" in data
            assert "current_temp" in data
        else:
            assert res["source_type"] == "unavailable"

    run_async(_test())


def test_maps_tool(run_async):
    async def _test():
        tool = MapsTool()
        res = await tool.get_route("Islamabad", "Hunza")
        assert "source_type" in res
        if res["success"]:
            assert res["source_type"] == "live"
            data = res["data"]
            assert data["origin"] == "Islamabad"
            assert data["destination"] == "Hunza"
            assert data["distance_km"] > 0
            assert data["drive_time_hours"] > 0
        else:
            assert res["source_type"] == "unavailable"

    run_async(_test())


def test_places_tool(run_async):
    async def _test():
        tool = PlacesTool()
        res = await tool.search_places("Hunza")
        assert "source_type" in res
        if res["success"]:
            assert res["source_type"] == "live"
            places = res["data"]
            assert len(places) >= 1
            assert "name" in places[0]
        else:
            assert res["source_type"] == "unavailable"

    run_async(_test())


def test_hotels_tool(run_async):
    async def _test():
        tool = HotelsTool()
        res = await tool.search_hotels("Hunza", budget_tier="mid_range")
        assert "source_type" in res
        if res["success"]:
            assert res["source_type"] == "live"
            hotels = res["data"]
            assert len(hotels) >= 1
            assert "name" in hotels[0]
        else:
            assert res["source_type"] == "unavailable"

    run_async(_test())


def test_restaurants_tool(run_async):
    async def _test():
        tool = RestaurantsTool()
        res = await tool.search_restaurants("Hunza")
        assert "source_type" in res
        if res["success"]:
            assert res["source_type"] == "live"
            restaurants = res["data"]
            assert len(restaurants) >= 1
            assert "name" in restaurants[0]
        else:
            assert res["source_type"] == "unavailable"

    run_async(_test())


def test_organizers_tool(run_async, test_db_session):
    async def _test():
        async with test_db_session() as session:
            test_org = Organizer(
                id="org-test-hunza",
                name="Hunza Explorers & Treks",
                description="Mountain guide host",
                contact_email="hunza@test.pk",
                destinations=["Hunza", "Gilgit"],
                is_verified=True,
            )
            session.add(test_org)
            await session.commit()
        tool = OrganizersTool(session_factory=test_db_session)
        res = await tool.search_organizers("Hunza")
        assert res["success"] is True
        assert res["source_type"] in ("live_db", "curated_seed")
        assert res["source"] == "friday_marketplace_db"

    run_async(_test())


def test_web_search_tool(run_async):
    async def _test():
        tool = WebSearchTool()
        res = await tool.search("Hunza Pakistan travel guide")
        assert "source_type" in res
        if res["success"]:
            assert res["source_type"] == "live"
            results = res["data"]["results"]
            assert len(results) >= 1
            assert "url" in results[0]
        else:
            assert res["source_type"] == "unavailable"

    run_async(_test())


def test_resend_email_tool(run_async):
    async def _test():
        tool = EmailTool()
        res = await tool.send_email(
            to="organizer@friday.pk",
            subject="Test Booking Notification",
            body="This is a test notification for trip booking #12345.",
        )
        assert "success" in res
        assert "source" in res
        assert "source_type" in res
        assert res["source"] in ("resend", "resend_api", "mock_email", "smtp", "unconfigured", "test_email_fixture")

    run_async(_test())
