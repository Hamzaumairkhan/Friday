"""
Friday® Live Geographic Destination Verification & Auto-Correction Service.
Uses OpenStreetMap Nominatim Live API as the true, authoritative source of truth.
Zero hardcoded destination dictionaries or static foreign country blacklists.
"""

import re
from typing import Dict, Any, List, Optional
import httpx
from app.core.logging import get_logger

logger = get_logger("services.pakistan_geo")

USER_AGENT = "Friday-Travel-Copilot/3.0 (travel@friday.pk)"
NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search"


class PakistanGeoService:
    """Live Dynamic Location Search & Verification powered by OpenStreetMap Nominatim."""

    @classmethod
    def _clean_query(cls, query: str) -> str:
        """Strip special characters and excess whitespace."""
        if not query:
            return ""
        q = re.sub(r"[^\w\s-]", " ", query.strip())
        return " ".join(q.split())

    @classmethod
    def _extract_canonical_name(cls, item: Dict[str, Any], raw_query: str) -> str:
        """Extract clean place name from OSM Nominatim address metadata."""
        address = item.get("address", {})
        # Priority order for city / town / valley / landmark name
        name = (
            address.get("city")
            or address.get("town")
            or address.get("village")
            or address.get("hamlet")
            or address.get("county")
            or address.get("state_district")
            or address.get("natural")
            or address.get("tourism")
            or address.get("historic")
            or item.get("name")
            or item.get("display_name", "").split(",")[0]
            or raw_query.title()
        )
        return name.strip()

    @classmethod
    async def validate_and_correct_destination(cls, query: str) -> Dict[str, Any]:
        """
        Live Dynamic Verification Flow:
        1. Query Live OSM Nominatim Search with raw query.
        2. Inspect returned country & address metadata.
        3. If country is Pakistan (country_code == 'pk'), accept & return structured geographic identity.
        4. If country is outside Pakistan (e.g. France, UAE, UK, US, India), reject with exact country identified.
        5. If not found, attempt Pakistan-scoped candidate search ('countrycodes=pk') to auto-correct typos.
        6. If still not found, reject as unverified / unknown.
        """
        raw_q = (query or "").strip()
        cleaned_q = cls._clean_query(raw_q)

        if not cleaned_q or len(cleaned_q) < 2:
            return {
                "is_valid_pakistan": False,
                "original_query": raw_q,
                "corrected_destination": None,
                "error": "Please enter a destination name in Pakistan.",
                "provider": "live_openstreetmap",
            }

        headers = {"User-Agent": USER_AGENT, "Accept-Language": "en"}

        try:
            async with httpx.AsyncClient(timeout=5.0, headers=headers) as client:
                # ─── 1. Live Global Search to detect whether place exists & its country ───────────
                params = {
                    "q": cleaned_q,
                    "format": "json",
                    "addressdetails": 1,
                    "limit": 5,
                    "accept-language": "en",
                }
                resp = await client.get(NOMINATIM_SEARCH_URL, params=params)

                if resp.status_code == 200:
                    results = resp.json()
                    if results and len(results) > 0:
                        top = results[0]
                        address = top.get("address", {})
                        country_code = (address.get("country_code") or "").lower()
                        country_name = address.get("country") or ""

                        # Check if any result in top candidates is in Pakistan
                        pk_candidate = None
                        foreign_candidate = None

                        for item in results:
                            item_addr = item.get("address", {})
                            item_cc = (item_addr.get("country_code") or "").lower()
                            if item_cc == "pk" or "pakistan" in (item_addr.get("country") or "").lower():
                                pk_candidate = item
                                break
                            elif not foreign_candidate and item_addr.get("country"):
                                foreign_candidate = item

                        # If top or candidate is in Pakistan -> ACCEPT!
                        if pk_candidate:
                            canonical = cls._extract_canonical_name(pk_candidate, raw_q)
                            region = (
                                pk_candidate.get("address", {}).get("state")
                                or pk_candidate.get("address", {}).get("state_district")
                                or "Pakistan"
                            )
                            was_corrected = (canonical.lower() != raw_q.lower())

                            # Ambiguous options if multiple Pakistan candidates exist
                            candidates_list = []
                            for c in results:
                                c_addr = c.get("address", {})
                                if (c_addr.get("country_code") or "").lower() == "pk":
                                    c_name = cls._extract_canonical_name(c, raw_q)
                                    c_region = c_addr.get("state") or "Pakistan"
                                    candidates_list.append({
                                        "canonical_name": c_name,
                                        "full_name": c.get("display_name"),
                                        "region": c_region,
                                        "lat": float(c.get("lat", 0.0)),
                                        "lon": float(c.get("lon", 0.0)),
                                    })

                            return {
                                "is_valid_pakistan": True,
                                "original_query": raw_q,
                                "canonical_name": canonical,
                                "corrected_destination": canonical,
                                "full_display_name": pk_candidate.get("display_name"),
                                "country": "Pakistan",
                                "region": region,
                                "latitude": float(pk_candidate.get("lat", 0.0)),
                                "longitude": float(pk_candidate.get("lon", 0.0)),
                                "place_type": pk_candidate.get("type", "administrative"),
                                "was_corrected": was_corrected,
                                "confidence": 0.95 if not was_corrected else 0.85,
                                "provider": "live_openstreetmap_nominatim",
                                "message": f"Verified in Pakistan: {canonical} ({region})",
                                "candidates": candidates_list[:4],
                            }

                        # If candidate is explicitly in another foreign country -> REJECT FOREIGN
                        if foreign_candidate:
                            f_country = foreign_candidate.get("address", {}).get("country", "outside Pakistan")
                            f_name = foreign_candidate.get("name") or raw_q.title()
                            return {
                                "is_valid_pakistan": False,
                                "original_query": raw_q,
                                "corrected_destination": None,
                                "country_detected": f_country,
                                "error": f"Friday is Pakistan's exclusive AI travel architect. '{f_name}' is located in {f_country}.",
                                "provider": "live_openstreetmap_nominatim",
                                "is_foreign": True,
                            }

                # ─── 2. If not found globally, attempt Live Search restricted to Pakistan ('countrycodes=pk') ───
                pk_params = {
                    "q": f"{cleaned_q}, Pakistan",
                    "format": "json",
                    "countrycodes": "pk",
                    "addressdetails": 1,
                    "limit": 5,
                    "accept-language": "en",
                }
                pk_resp = await client.get(NOMINATIM_SEARCH_URL, params=pk_params)
                if pk_resp.status_code == 200:
                    pk_results = pk_resp.json()
                    if pk_results and len(pk_results) > 0:
                        top = pk_results[0]
                        canonical = cls._extract_canonical_name(top, raw_q)
                        region = top.get("address", {}).get("state") or "Pakistan"
                        return {
                            "is_valid_pakistan": True,
                            "original_query": raw_q,
                            "canonical_name": canonical,
                            "corrected_destination": canonical,
                            "full_display_name": top.get("display_name"),
                            "country": "Pakistan",
                            "region": region,
                            "latitude": float(top.get("lat", 0.0)),
                            "longitude": float(top.get("lon", 0.0)),
                            "place_type": top.get("type", "location"),
                            "was_corrected": True,
                            "confidence": 0.88,
                            "provider": "live_openstreetmap_nominatim",
                            "message": f"Verified location in Pakistan: {canonical} ({region})",
                        }

                # ─── 3. Typo Auto-Correction: De-duplicate repeated characters (e.g. Skarduu -> Skardu, Hunzaa -> Hunza) ───
                dedup_q = re.sub(r"(.)\1+", r"\1", cleaned_q)
                if dedup_q.lower() != cleaned_q.lower():
                    dedup_params = {
                        "q": f"{dedup_q}, Pakistan",
                        "format": "json",
                        "countrycodes": "pk",
                        "addressdetails": 1,
                        "limit": 5,
                        "accept-language": "en",
                    }
                    d_resp = await client.get(NOMINATIM_SEARCH_URL, params=dedup_params)
                    if d_resp.status_code == 200:
                        d_results = d_resp.json()
                        if d_results and len(d_results) > 0:
                            top = d_results[0]
                            canonical = cls._extract_canonical_name(top, raw_q)
                            region = top.get("address", {}).get("state") or "Pakistan"
                            return {
                                "is_valid_pakistan": True,
                                "original_query": raw_q,
                                "canonical_name": canonical,
                                "corrected_destination": canonical,
                                "full_display_name": top.get("display_name"),
                                "country": "Pakistan",
                                "region": region,
                                "latitude": float(top.get("lat", 0.0)),
                                "longitude": float(top.get("lon", 0.0)),
                                "place_type": top.get("type", "location"),
                                "was_corrected": True,
                                "confidence": 0.88,
                                "provider": "live_openstreetmap_nominatim",
                                "message": f"Verified location in Pakistan: {canonical} ({region})",
                            }

        except httpx.TimeoutException:
            logger.warning(f"Live Nominatim verification timeout for '{cleaned_q}'")
            return {
                "is_valid_pakistan": False,
                "original_query": raw_q,
                "corrected_destination": None,
                "error": "Live location verification timed out. Please check connection or retry.",
                "provider": "live_openstreetmap_nominatim",
                "provider_status": "TIMEOUT",
            }
        except Exception as e:
            logger.warning(f"Live Nominatim error for '{cleaned_q}': {e}")
            return {
                "is_valid_pakistan": False,
                "original_query": raw_q,
                "corrected_destination": None,
                "error": f"Live location verification error: {e}",
                "provider": "live_openstreetmap_nominatim",
                "provider_status": "ERROR",
            }

        # ─── 3. No live location found anywhere ──────────────────────────────
        return {
            "is_valid_pakistan": False,
            "original_query": raw_q,
            "corrected_destination": None,
            "error": f"Could not verify '{raw_q}' as a real location in Pakistan.",
            "provider": "live_openstreetmap_nominatim",
        }
