"""Reviews API endpoints."""

import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database.database import get_db
from app.models.review import Review
from app.models.package import Package
from app.models.organizer import Organizer
from app.models.user import User
from app.schemas.review import ReviewCreate, ReviewResponse
from app.core.security import get_current_user

router = APIRouter(tags=["Reviews"])


def _format_review(r: Review) -> ReviewResponse:
    return ReviewResponse(
        id=r.id,
        user_id=r.user_id,
        organizer_id=r.organizer_id,
        package_id=r.package_id,
        rating=r.rating,
        title=r.title,
        content=r.content,
        reviewer_name=r.reviewer_name or "Traveler",
        created_at=r.created_at.isoformat() if r.created_at else "",
    )


@router.get("/packages/{package_id}/reviews", response_model=List[ReviewResponse])
async def list_package_reviews(
    package_id: str,
    db: AsyncSession = Depends(get_db),
):
    """List all authentic traveler reviews for a specific tour package."""
    result = await db.execute(
        select(Review).where(Review.package_id == package_id).order_by(Review.created_at.desc())
    )
    reviews = result.scalars().all()
    return [_format_review(r) for r in reviews]


@router.post("/packages/{package_id}/reviews", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
async def create_package_review(
    package_id: str,
    req: ReviewCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Submit an authentic traveler review for a tour package. Recalculates live ratings dynamically."""
    pkg_res = await db.execute(select(Package).where(Package.id == package_id))
    pkg = pkg_res.scalar_one_or_none()
    if not pkg:
        raise HTTPException(status_code=404, detail="Tour package not found")

    rev_id = f"rev-{uuid.uuid4().hex[:12]}"
    new_rev = Review(
        id=rev_id,
        user_id=current_user.id,
        organizer_id=pkg.organizer_id,
        package_id=pkg.id,
        rating=round(float(req.rating), 1),
        title=req.title,
        content=req.content,
        reviewer_name=current_user.name or "Traveler",
    )
    db.add(new_rev)
    await db.flush()

    # Recalculate package average rating & count
    pkg_revs = await db.execute(
        select(func.avg(Review.rating), func.count(Review.id)).where(Review.package_id == pkg.id)
    )
    pkg_avg, pkg_count = pkg_revs.first()
    pkg.rating = round(float(pkg_avg or req.rating), 1)
    pkg.reviews_count = int(pkg_count or 1)

    # Recalculate organizer average rating & count
    org_res = await db.execute(select(Organizer).where(Organizer.id == pkg.organizer_id))
    org = org_res.scalar_one_or_none()
    if org:
        org_revs = await db.execute(
            select(func.avg(Review.rating), func.count(Review.id)).where(Review.organizer_id == org.id)
        )
        org_avg, org_count = org_revs.first()
        org.rating = round(float(org_avg or req.rating), 1)
        org.reviews_count = int(org_count or 1)

    await db.commit()
    await db.refresh(new_rev)
    return _format_review(new_rev)
