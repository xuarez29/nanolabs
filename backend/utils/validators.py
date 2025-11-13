from __future__ import annotations

from decimal import Decimal


def validate_reference_range(ref_min: Decimal, ref_max: Decimal) -> None:
    """Raise ValueError if the reference range is invalid."""
    if ref_min is not None and ref_max is not None and ref_min > ref_max:
        raise ValueError("ref_min cannot be greater than ref_max")
