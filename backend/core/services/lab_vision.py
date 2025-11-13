from __future__ import annotations

import json
import logging
from typing import Any, Dict, Optional

from django.conf import settings
from openai import OpenAI

logger = logging.getLogger(__name__)

LAB_PARSER_PROMPT = """
You are an expert document-vision assistant. Given OCR text extracted from a lab report
(including tables rendered as plain text), you must detect analytes, their measured values,
units, reference ranges (when provided), the measurement date, and any additional metadata
(lab name, method, etc.). Output a strict JSON object:

{
  "lab_name": "string|null",
  "report_date": "ISO-8601 string|null",
  "analytes": [
    {
      "name": "string",
      "value": number,
      "unit": "string|null",
      "ref_min": number|null,
      "ref_max": number|null,
      "method": "string|null",
      "measured_at": "ISO-8601 string|null",
      "raw_line": "original text snippet for traceability"
    }
  ],
  "uncertainties": ["string notes about ambiguous or missing data"]
}

Rules:
- Read context to avoid confusing birth dates with report dates.
- If multiple values for the same analyte exist, keep them all with their timestamps when available.
- Never invent data; only include fields observed explicitly in the text. If a value is unreadable, set it to null and add a note in “uncertainties”.
- Preserve decimals and units exactly as written.
"""


def parse_lab_document_with_ai(ocr_text: str) -> Optional[Dict[str, Any]]:
    api_key = getattr(settings, "OPENAI_API_KEY", None)
    if not api_key or not ocr_text:
        return None
    client = OpenAI(api_key=api_key)
    truncated_text = ocr_text[:40000]  # prevent overly large payloads
    try:
        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            temperature=0,
            messages=[
                {"role": "system", "content": LAB_PARSER_PROMPT},
                {"role": "user", "content": truncated_text},
            ],
        )
        content = completion.choices[0].message.content or "{}"
        data = json.loads(content)
        return data
    except Exception as exc:  # noqa: BLE001
        logger.exception("AI lab parsing failed: %s", exc)
        return None
