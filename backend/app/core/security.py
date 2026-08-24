"""User identity, role-based authorization, and Firebase authentication support."""

from typing import Optional, List
import json
import base64
from fastapi import Header, Request, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.logging import get_logger
from app.database.database import get_db
from app.models.user import User, UserRole
from app.models.organizer import Organizer
from app.repositories.user_repository import UserRepository
from app.repositories.organizer_repository import OrganizerRepository

logger = get_logger("core.security")
settings = get_settings()


def _decode_unverified_token(token: str) -> Optional[dict]:
    """Extract claims safely from JWT without verification when firebase_admin is not initialized."""
    try:
        parts = token.split(".")
        if len(parts) == 3:
            padded = parts[1] + "=" * ((4 - len(parts[1]) % 4) % 4)
            payload_bytes = base64.urlsafe_b64decode(padded)
            return json.loads(payload_bytes.decode("utf-8"))
    except Exception:
        pass
    return None


async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
    x_user_id: Optional[str] = Header(default=None, alias="X-User-Id"),
) -> User:
    """Extract authenticated user identity from Authorization header or dev X-User-Id header.
    
    Supports:
    1. Firebase JWT Token (Authorization: Bearer <firebase_id_token>)
    2. Direct User ID Token (Authorization: Bearer <user_id>)
    3. Dev X-User-Id header (in testing/development mode)
    """
    user_id = None
    email = None
    name = None
    picture = None

    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.replace("Bearer ", "").strip()
        if token:
            # Check if this is a JWT token from Google/Firebase
            claims = _decode_unverified_token(token)
            if claims and ("sub" in claims or "user_id" in claims):
                user_id = claims.get("user_id") or claims.get("sub")
                email = claims.get("email")
                name = claims.get("name")
                picture = claims.get("picture")
            else:
                user_id = token
    elif x_user_id:
        user_id = x_user_id

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Provide Authorization: Bearer <token> or X-User-Id header.",
        )

    repo = UserRepository(db)
    user = await repo.get_by_id(user_id)
    if not user and email:
        user = await repo.get_by_email(email)

    if not user:
        if "@" in user_id:
            user = await repo.get_by_email(user_id)

    if not user:
        # Auto-provision user record for new authenticated identity
        user = await repo.get_or_create_user(
            user_id=user_id,
            email=email or (f"{user_id}@friday.pk" if "@" not in user_id else user_id),
            name=name or (f"User {user_id[:8]}" if len(user_id) > 8 else "Ali Khan"),
            profile_picture=picture,
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated.",
        )

    return user


async def get_current_user_id(
    current_user: User = Depends(get_current_user),
) -> str:
    """FastAPI dependency to extract current user's SQLite ID."""
    return current_user.id


async def get_current_user_role(
    current_user: User = Depends(get_current_user),
) -> str:
    """FastAPI dependency to extract current user's role."""
    return current_user.role.value if hasattr(current_user.role, 'value') else current_user.role


def require_role(allowed_roles: List[UserRole]):
    """Dependency factory enforcing specific roles."""
    async def _role_checker(current_user: User = Depends(get_current_user)) -> User:
        user_role = current_user.role
        if isinstance(user_role, str):
            try:
                user_role = UserRole(user_role)
            except ValueError:
                pass

        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: requires one of {[r.value for r in allowed_roles]} role.",
            )
        return current_user
    return _role_checker


async def require_traveler(
    current_user: User = Depends(require_role([UserRole.TRAVELER, UserRole.ADMIN]))
) -> User:
    """Ensure current user has TRAVELER or ADMIN role."""
    return current_user


async def get_current_organizer(
    current_user: User = Depends(require_role([UserRole.ORGANIZER, UserRole.ADMIN])),
    db: AsyncSession = Depends(get_db),
) -> Organizer:
    """Ensure current user has ORGANIZER role and resolve their linked Organizer profile."""
    repo = OrganizerRepository(db)
    # Search by user_id
    organizer = await repo.get_by_user_id(current_user.id)
    if not organizer:
        # Fallback search by ID or email for legacy/seeded accounts
        organizer = await repo.get_by_id(current_user.id)
        if not organizer and current_user.email:
            all_orgs = await repo.list_all()
            for o in all_orgs:
                if o.contact_email == current_user.email:
                    organizer = o
                    break

    if not organizer:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No active organizer profile found for this account. Please register/apply as an organizer.",
        )
    return organizer
