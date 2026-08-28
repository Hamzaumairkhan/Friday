"""Payment schemas for proof upload and verification."""

from typing import Optional
from pydantic import BaseModel, Field


class PaymentProofSubmit(BaseModel):
    """Traveler submits a Cloudinary URL as payment proof."""
    payment_proof_url: str = Field(..., min_length=5)


class PaymentVerifyRequest(BaseModel):
    """Organizer verifies or rejects a payment proof."""
    action: str = Field(..., pattern="^(VERIFY|REJECT)$")
    rejection_reason: Optional[str] = None
