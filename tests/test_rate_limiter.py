"""Tests for SlidingWindowRateLimiter and rate limiting behavior."""

import pytest
import time
from app.core.rate_limiter import SlidingWindowRateLimiter


def test_rate_limiter_allows_under_limit():
    """Verify that requests under the threshold are allowed."""
    limiter = SlidingWindowRateLimiter(default_limit=5, window_seconds=2)
    key = "client-test-1"

    for _ in range(5):
        is_limited, remaining, retry_after = limiter.is_rate_limited(key, limit=5)
        assert is_limited is False
        assert retry_after == 0


def test_rate_limiter_blocks_over_limit():
    """Verify that requests exceeding the limit are blocked with retry_after."""
    limiter = SlidingWindowRateLimiter(default_limit=3, window_seconds=2)
    key = "client-test-2"

    for _ in range(3):
        is_limited, _, _ = limiter.is_rate_limited(key, limit=3)
        assert is_limited is False

    # 4th request must be blocked
    is_limited, remaining, retry_after = limiter.is_rate_limited(key, limit=3)
    assert is_limited is True
    assert remaining == 0
    assert retry_after >= 1


def test_rate_limiter_sliding_window_expiry():
    """Verify that rate limiter resets after window_seconds elapse."""
    limiter = SlidingWindowRateLimiter(default_limit=2, window_seconds=1)
    key = "client-test-3"

    limiter.is_rate_limited(key, limit=2)
    limiter.is_rate_limited(key, limit=2)

    is_limited, _, _ = limiter.is_rate_limited(key, limit=2)
    assert is_limited is True

    # Sleep for window to expire
    time.sleep(1.1)

    is_limited, remaining, _ = limiter.is_rate_limited(key, limit=2)
    assert is_limited is False
    assert remaining == 1
