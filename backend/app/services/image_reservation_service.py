"""Service for atomic reservation of globally unique travel image URLs."""

from typing import List, Optional
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.image_reservation import ImageReservation
from app.models.trip import Trip
from app.models.package import Package
from app.core.logging import get_logger

logger = get_logger("services.image_reservation")


async def get_all_used_image_urls(session: AsyncSession) -> set[str]:
    """Retrieve all image URLs currently in use across trips, packages, and reservations."""
    used = set()
    
    # Check image_reservations table
    res_stmt = select(ImageReservation.image_url)
    res_rows = (await session.execute(res_stmt)).scalars().all()
    used.update(r for r in res_rows if r)

    # Check packages table
    pkg_stmt = select(Package.image_url).where(Package.image_url.isnot(None))
    pkg_rows = (await session.execute(pkg_stmt)).scalars().all()
    used.update(r for r in pkg_rows if r)

    # Check trips table
    trip_stmt = select(Trip.image_url).where(Trip.image_url.isnot(None))
    trip_rows = (await session.execute(trip_stmt)).scalars().all()
    used.update(r for r in trip_rows if r)

    return used


async def claim_unique_image(
    candidate_urls: List[str],
    entity_type: str,
    entity_id: str,
    destination: str,
    session: AsyncSession,
) -> Optional[str]:
    """
    Atomically reserve the first unused valid image URL from the candidate list.
    Guarantees that no two trips or packages share the same image URL.
    Returns the claimed URL, or None if all candidates are exhausted.
    """
    if not candidate_urls:
        return None

    used_urls = await get_all_used_image_urls(session)

    for url in candidate_urls:
        if not url or not isinstance(url, str):
            continue
        clean_url = url.strip()
        if not clean_url:
            continue

        # Check if URL is already claimed
        if clean_url in used_urls:
            continue

        try:
            # Attempt atomic reservation
            reservation = ImageReservation(
                image_url=clean_url[:500],
                entity_type=entity_type,
                entity_id=entity_id,
                destination=destination,
                reserved_at=datetime.utcnow(),
            )
            session.add(reservation)
            await session.flush()
            logger.info(f"Atomically reserved unique image for {entity_type} {entity_id} ({destination}): {clean_url}")
            return clean_url
        except Exception as e:
            # Duplicate key or conflict, roll back this savepoint and try next
            await session.rollback()
            used_urls.add(clean_url)
            logger.debug(f"Image URL reservation collision on {clean_url}: {e}")

    logger.info(f"All candidate images exhausted for {destination} ({entity_type} {entity_id}). Setting image_url = None.")
    return None
