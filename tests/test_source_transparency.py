"""Tests ensuring strict source transparency across all 8 tools and services."""

import pytest
from app.tools.weather import WeatherTool
from app.tools.places import PlacesTool
from app.tools.maps import MapsTool
from app.tools.hotels import HotelsTool
from app.tools.restaurants import RestaurantsTool
from app.tools.organizers import OrganizersTool
from app.tools.web_search import WebSearchTool
from app.tools.whatsapp import WhatsAppTool


def test_weather_source_transparency(run_async):
    """Weather tool must explicitly distinguish live vs curated seasonal data."""
    async def _test():
        tool = WeatherTool()
        res = await tool.get_weather("Hunza")
        assert "source" in res
        assert "source_type" in res
        assert res["source_type"] in ("live", "curated_seasonal", "unavailable")
        if res["source_type"] == "curated_seasonal":
            assert res["data"].get("is_live") is False

    run_async(_test())


def test_places_source_transparency(run_async):
    """Places tool must never claim curated attractions are live Google data."""
    async def _test():
        tool = PlacesTool()
        res = await tool.search_places("Skardu")
        assert "source" in res
        assert "source_type" in res
        assert res["source_type"] in ("live", "curated", "unavailable")
        if res["source_type"] == "curated":
            assert res["source"] == "curated_pakistan_pois"

    run_async(_test())


def test_maps_source_transparency(run_async):
    """Maps tool must report whether highway route is live or curated."""
    async def _test():
        tool = MapsTool()
        res = await tool.get_route("Islamabad", "Swat")
        assert "source" in res
        assert "source_type" in res
        assert res["source_type"] in ("live", "curated", "unavailable")
        if res["source_type"] == "curated":
            assert res["source"] == "curated_pakistan_routes"

    run_async(_test())


def test_hotels_source_transparency(run_async):
    """Hotels tool must distinguish live booking availability from static price tiers."""
    async def _test():
        tool = HotelsTool()
        res = await tool.search_hotels("Hunza")
        assert "source" in res
        assert "source_type" in res
        assert res["source_type"] in ("live", "curated", "unavailable")
        if res["source_type"] == "curated":
            assert res["source"] == "curated_pakistan_hotels"

    run_async(_test())


def test_restaurants_source_transparency(run_async):
    """Restaurants tool must report source_type accurately."""
    async def _test():
        tool = RestaurantsTool()
        res = await tool.search_restaurants("Hunza")
        assert "source" in res
        assert "source_type" in res
        assert res["source_type"] in ("live", "curated", "unavailable")

    run_async(_test())


def test_organizers_source_transparency(run_async):
    """Organizers must report curated_seed status and friday_marketplace_db source."""
    async def _test():
        tool = OrganizersTool()
        res = await tool.search_organizers("Hunza")
        assert res["source_type"] == "curated_seed"
        assert res["source"] == "friday_marketplace_db"
        assert "data_disclaimer" in res

    run_async(_test())


def test_web_search_source_transparency(run_async):
    """Web search tool must return live or unavailable without fabricating URLs."""
    async def _test():
        tool = WebSearchTool()
        res = await tool.search("Karakoram Highway travel tips")
        assert "source_type" in res
        assert res["source_type"] in ("live", "unavailable")

    run_async(_test())


def test_whatsapp_source_transparency(run_async):
    """WhatsApp tool must report service status honestly."""
    async def _test():
        tool = WhatsAppTool(service_url="http://127.0.0.1:39999")
        res = await tool.send_whatsapp(to_number="+923001234567", message="Hello")
        assert res["success"] is False
        assert res["source_type"] == "unavailable"
        assert res["status"] == "service_offline"

    run_async(_test())
