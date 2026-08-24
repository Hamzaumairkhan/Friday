"""Tests for external tool failure paths, invalid inputs, and fallback isolation."""

import pytest
from app.tools.weather import WeatherTool
from app.tools.places import PlacesTool
from app.tools.maps import MapsTool
from app.tools.hotels import HotelsTool
from app.tools.restaurants import RestaurantsTool
from app.tools.whatsapp import WhatsAppTool
from app.tools.web_search import WebSearchTool


def test_places_empty_input(run_async):
    """Empty destination returns graceful validation error."""
    async def _test():
        tool = PlacesTool()
        res = await tool.search_places("")
        assert res["success"] is False
        assert res["source_type"] == "invalid_input"
        assert "error" in res

    run_async(_test())


def test_places_unknown_destination(run_async):
    """Unknown destination without API key returns structured unavailable response."""
    async def _test():
        tool = PlacesTool()
        res = await tool.search_places("AtlantisLostCity")
        assert res["success"] is False
        assert res["source_type"] == "unavailable"
        assert res["count"] == 0

    run_async(_test())


def test_maps_empty_inputs(run_async):
    """Empty origin/destination returns validation failure."""
    async def _test():
        tool = MapsTool()
        res = await tool.get_route(origin="", destination="")
        assert res["success"] is False
        assert res["source_type"] == "invalid_input"

    run_async(_test())


def test_maps_unknown_route(run_async):
    """Unknown route without live OSRM routing data returns unavailable."""
    async def _test():
        tool = MapsTool()
        res = await tool.get_route(origin="FictionalTownA", destination="FictionalTownB")
        assert res["success"] is False
        assert res["source_type"] == "unavailable"

    run_async(_test())


def test_hotels_empty_input(run_async):
    """Empty destination to hotels tool returns invalid_input."""
    async def _test():
        tool = HotelsTool()
        res = await tool.search_hotels(destination="")
        assert res["success"] is False
        assert res["source_type"] == "invalid_input"

    run_async(_test())


def test_hotels_unknown_destination(run_async):
    """Unknown destination to hotels returns unavailable without crashing."""
    async def _test():
        tool = HotelsTool()
        res = await tool.search_hotels(destination="MarsBaseAlpha")
        assert res["success"] is False
        assert res["source_type"] == "unavailable"

    run_async(_test())


def test_restaurants_empty_input(run_async):
    """Empty destination to restaurants returns invalid_input."""
    async def _test():
        tool = RestaurantsTool()
        res = await tool.search_restaurants(destination="")
        assert res["success"] is False
        assert res["source_type"] == "invalid_input"

    run_async(_test())


def test_restaurants_unknown_destination(run_async):
    """Unknown destination returns unavailable gracefully."""
    async def _test():
        tool = RestaurantsTool()
        res = await tool.search_restaurants(destination="MarsBaseAlpha")
        assert res["success"] is False
        assert res["source_type"] == "unavailable"

    run_async(_test())


def test_whatsapp_empty_phone(run_async):
    """Empty phone number returns validation error."""
    async def _test():
        tool = WhatsAppTool()
        res = await tool.send_whatsapp(to_number="", message="Test")
        assert res["success"] is False
        assert res["source_type"] == "invalid_input"

    run_async(_test())


def test_carrier_sms_unconfigured(run_async):
    """Carrier SMS returns honest unconfigured response."""
    async def _test():
        tool = WhatsAppTool()
        res = await tool.send_sms(to_number="03001234567", message="Test SMS")
        assert res["success"] is False
        assert res["source_type"] == "unavailable"
        assert res["status"] == "carrier_sms_unconfigured"

    run_async(_test())


def test_web_search_empty_query(run_async):
    """Empty query returns validation error."""
    async def _test():
        tool = WebSearchTool()
        res = await tool.search(query="")
        assert res["success"] is False
        assert res["source_type"] == "invalid_input"

    run_async(_test())
