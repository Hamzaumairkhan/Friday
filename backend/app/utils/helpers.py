"""General helper functions."""

import uuid
from typing import Any


def generate_id() -> str:
    """Generate a unique ID."""
    return str(uuid.uuid4())


def safe_get(data: dict, key: str, default: Any = None) -> Any:
    """Safely get a nested key from a dict."""
    keys = key.split(".")
    current = data
    for k in keys:
        if isinstance(current, dict):
            current = current.get(k, default)
        else:
            return default
    return current
