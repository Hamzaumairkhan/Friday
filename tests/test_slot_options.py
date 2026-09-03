import pytest
from app.services.dynamic_research_service import DynamicDestinationResearchService


def test_slot_options_generic_destinations():
    """Verify that slot options work generically across any destination in Pakistan."""
    test_destinations = [
        "Rawalpindi",
        "Islamabad",
        "Islamabad & Rawalpindi",
        "Lahore",
        "Karachi",
        "Multan",
        "Murree",
        "Hunza",
        "Skardu",
        "Swat",
        "Naran",
        "Kumrat Valley",
        "   Lahore   ",
        "ISLAMABAD",
        "",
    ]

    for dest in test_destinations:
        res = DynamicDestinationResearchService.get_slot_options(dest)
        assert isinstance(res, dict), f"Failed for {dest}"
        assert "morning" in res, f"Missing morning for {dest}"
        assert "afternoon" in res, f"Missing afternoon for {dest}"
        assert "evening" in res, f"Missing evening for {dest}"

        for slot_key in ["morning", "afternoon", "evening"]:
            slot = res[slot_key]
            assert "label" in slot
            assert "options" in slot
            assert len(slot["options"]) == 4, f"Slot {slot_key} does not have 4 options for {dest}"
            option_ids = [opt["id"] for opt in slot["options"]]
            assert "opt_d" in option_ids, f"Option D missing in {slot_key} for {dest}"

            # Check that destination title is present when destination is provided
            cleaned = dest.strip()
            if cleaned:
                # Option A should include the destination
                assert cleaned in slot["options"][0]["title"]
            else:
                assert "Your Destination" in slot["options"][0]["title"]
