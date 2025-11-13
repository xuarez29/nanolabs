from __future__ import annotations

from django.utils import timezone

from core.services import pdf_parser


def test_extract_analytes_from_text_matches_known_patterns():
    text = """
    Report Date: 2025-11-05
    Glucose 95 mg/dL (70-100)
    HDL 45 mg/dL 40 - 60
    LDL: 130 mg/dL Reference 0-130 mg/dL
    """
    measured_at = timezone.now()
    results = pdf_parser._extract_analytes_from_text(text, measured_at)
    names = {item["name"] for item in results}
    assert {"glucose", "hdl", "ldl"}.issubset(names)
    glucose = next(item for item in results if item["name"] == "glucose")
    assert glucose["value"] == 95
    assert glucose["ref_min"] == 70
    assert glucose["ref_max"] == 100


def test_parse_report_date_handles_multiple_formats():
    text = "Some header\nReport Date: 11/05/2025"
    parsed = pdf_parser._parse_report_date(text)
    assert parsed is not None
    assert parsed.year == 2025
