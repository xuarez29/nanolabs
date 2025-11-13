from __future__ import annotations

import json
import logging
from typing import Any, Dict

from django.conf import settings
from openai import OpenAI

from core.models import Report, ResultValue

logger = logging.getLogger(__name__)

DEFAULT_INSIGHTS = {
    "key_results": [],
    "explanation": "No se generaron hallazgos adicionales para este reporte.",
    "recommended_tests": [],
    "actions": [],
    "triage": "routine",
    "uncertainties": [],
    "disclaimer": "La información presentada no reemplaza la valoración de un profesional de la salud.",
}


def _result_to_payload(result: ResultValue) -> Dict[str, Any]:
    return {
        "analyte": result.analyte.name,
        "value": float(result.value),
        "unit": result.unit,
        "ref_min": float(result.ref_min),
        "ref_max": float(result.ref_max),
        "flag": result.flag,
        "measured_at": result.measured_at.isoformat(),
    }


def _format_key_result(payload: Dict[str, Any]) -> Dict[str, Any]:
    ref_range = f"{payload['ref_min']} - {payload['ref_max']} {payload['unit']}"
    status_map = {
        ResultValue.Flag.NORMAL: "normal",
        ResultValue.Flag.HIGH: "high",
        ResultValue.Flag.LOW: "low",
    }
    status = status_map.get(payload.get("flag"), "not_available")
    reason = "Valor dentro del rango esperado." if status == "normal" else "Valor fuera del intervalo de referencia registrado."
    return {
        "analyte": payload.get("analyte"),
        "value": payload.get("value"),
        "unit": payload.get("unit"),
        "ref_range": ref_range,
        "status": status,
        "reason": reason,
        "confidence": 0.4,
    }


def _fallback_insights(report: Report) -> Dict[str, Any]:
    results = [_result_to_payload(r) for r in report.results.all()]
    if not results:
        return DEFAULT_INSIGHTS
    flagged = [r for r in results if r["flag"] != ResultValue.Flag.NORMAL]
    highlights = flagged or results[:3]
    explanation = "Se analizaron los valores disponibles y se resaltan aquellos fuera del rango de referencia."
    recommended = []
    actions = []
    triage = "routine"
    if flagged:
        explanation = "Se detectaron valores fuera del rango de referencia; considera consultar a tu médico para orientación personalizada."
        triage = "priority"
        for item in flagged:
            recommended.append({"test": item["analyte"], "why": "Verificar la tendencia del analito."})
            actions.append(
                {
                    "action": f"Comenta el resultado de {item['analyte']} con tu profesional de salud",
                    "why": "Es importante confirmar si se requieren estudios adicionales.",
                    "type": "medical_followup",
                }
            )
    key_results = [_format_key_result(item) for item in highlights]
    return {
        "key_results": key_results,
        "explanation": explanation,
        "recommended_tests": recommended,
        "actions": actions,
        "triage": triage,
        "uncertainties": [],
        "disclaimer": DEFAULT_INSIGHTS["disclaimer"],
    }


def generate_insights(report: Report) -> Dict[str, Any]:
    api_key = getattr(settings, "OPENAI_API_KEY", None)
    results = [_result_to_payload(r) for r in report.results.all()]
    if not results:
        return DEFAULT_INSIGHTS
    if not api_key:
        return _fallback_insights(report)

    client = OpenAI(api_key=api_key)
    prompt = """
ROLE
You are a medical lab analyst. Your job is to extract signal from lab results and explain the results plainly.

INPUT
You will receive a JSON payload with:
- results: array of lab measurements. Each item MAY include: analyte, value, unit, ref_range (e.g., "70–100 mg/dL"), method, date.
- patient (optional): age, sex, pregnancy_status, conditions, meds, symptoms.
- locale (optional): BCP-47 tag (default "es-MX") for explanation language and units style.

TASK
1) Highlight the most meaningful findings, and explain why they are meaningful. explain everything in spanish
2) Explain them in clear everyday language for the specified locale.
3) Suggest reasonable next tests (if any), with rationale.
4) Recommend safe lifestyle actions appropriate for a general audience.

OUTPUT
Respond with ONLY valid JSON (no prose outside JSON) that matches exactly this schema:

{
  "key_results": [
    {
      "analyte": "string",
      "value": "string|number",
      "unit": "string|null",
      "ref_range": "string|null",
      "status": "low|normal|high|critical|not_available",
      "reason": "string (why this is meaningful in <= 2 sentences)",
      "confidence": 0.0
    }
  ],
  "explanation": "string (plain-language, 1–3 short paragraphs, in locale language)",
  "recommended_tests": [
    { "test": "string", "why": "string (<= 1 sentence)" }
  ],
  "actions": [
    { "action": "string", "why": "string (<= 1 sentence)", "type": "lifestyle|medical_followup" }
  ],
  "triage": "routine|priority|urgent",
  "uncertainties": [
    "string (missing data, unusual units, conflicting values, etc.)"
  ],
  "disclaimer": "string (short, non-diagnostic safety note)"
}

RULES
- Use ONLY provided data; do not invent values or reference ranges.
- If ref_range is missing, set status = "not_available" unless you can infer safely from an explicit flag in input.
- Status mapping: compare value vs ref_range when available; flag extreme/unsafe values as "critical". If date suggests old data, mention it in uncertainties.
- Keep tone practical. Prefer sleep, diet, hydration, activity, stress control, and “consult a professional if …”.
- Tailor language to locale (default es-MX). Keep free of jargon; define any unavoidable term in simple words.
- If information is insufficient to suggest tests or actions, return empty arrays for those fields.
- Output MUST be valid JSON and MUST follow the schema exactly.
"""
    try:
        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            temperature=0.4,
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": json.dumps({"results": results})},
            ],
        )
        content = completion.choices[0].message.content or "{}"
        data = json.loads(content)
        return {
            "key_results": data.get("key_results", []),
            "explanation": data.get("explanation", ""),
            "recommended_tests": data.get("recommended_tests", []),
            "actions": data.get("actions", []),
            "triage": data.get("triage", "routine"),
            "uncertainties": data.get("uncertainties", []),
            "disclaimer": data.get("disclaimer", DEFAULT_INSIGHTS["disclaimer"]),
        }
    except Exception as exc:  # noqa: BLE001
        logger.exception("AI insight generation failed: %s", exc)
        return _fallback_insights(report)
