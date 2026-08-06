"""Weighted-rubric scoring: access to shared/interview-rubric.json plus the
DETERMINISTIC decision engine (category scores -> composite -> verdict -> hard
gates). No model calls here — the model only produces per-sub-criterion 1-5
scores (see evaluate.py); everything downstream of those scores is plain code
so it is reproducible and auditable.

MIRROR: lib/ai/rubric.ts (Next.js side) is the logical twin of this module
(same prompt text, same tool schema, same formulas, same rounding). If you
change one, change the other. The rubric itself lives ONLY in
shared/interview-rubric.json — never inline rubric content here.

Formulas (documented in the rubric JSON notes as well):
  categoryScore  = mean of its sub-criterion scores           (1-5)
  selective bar  : composite = sum (weight/sum_weights) * ((categoryScore-1)/4) * 100
                   -> straight 3s ("meets") = 50 = fail
  standard bar   : piecewise-linear remap of the selective composite x:
                   x <= 50 -> 1.4*x ; x > 50 -> 70 + 0.6*(x-50)
                   -> straight 3s = 70 = pass, all-1s = 0, all-5s = 100
  Composite is rounded half-up to 1 decimal BEFORE banding.
  Gates (verdict caps, applied after banding):
    communication category <= 20 on its 0-100 scale -> cap "fail"
    any must-have sub-criterion <= 2                -> cap "borderline"
    integrity (DORMANT hook — nothing triggers it)  -> cap "fail"

Deliberately stdlib-only (no pydantic/supabase imports) so this module can be
exercised standalone (parity checks against the TS engine).
"""

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any, Dict, List, Optional

# voice-agent/lib/rubric.py -> parents[2] = repo root.
_RUBRIC_PATH = Path(__file__).resolve().parents[2] / "shared" / "interview-rubric.json"

with _RUBRIC_PATH.open("r", encoding="utf-8") as _f:
    RUBRIC: Dict[str, Any] = json.load(_f)

ALL_SUB_CRITERION_KEYS: List[str] = [
    sub["key"] for cat in RUBRIC["categories"] for sub in cat["subCriteria"]
]

_SUM_OF_WEIGHTS = sum(cat["weight"] for cat in RUBRIC["categories"])

_VERDICT_RANK = {"fail": 0, "borderline": 1, "pass": 2, "strong_pass": 3}

# verdict -> legacy Level tier for the existing `tier` column/badges.
_VERDICT_TIER = {
    "strong_pass": "expert",
    "pass": "advanced",
    "borderline": "novice",
    "fail": "entry",
}


def resolve_must_have_keys(job_must_have_criteria: Any) -> List[str]:
    """A valid string list (filtered to known keys, explicit [] respected = no
    must-haves) or, for None/malformed values, the rubric's defaultMustHave."""
    if isinstance(job_must_have_criteria, list) and all(
        isinstance(k, str) for k in job_must_have_criteria
    ):
        return [k for k in job_must_have_criteria if k in ALL_SUB_CRITERION_KEYS]
    return list(RUBRIC["defaultMustHave"])


def resolve_passing_bar(job_passing_bar: Any) -> str:
    """'standard' passes through; anything else (incl. None) = 'selective'."""
    return "standard" if job_passing_bar == "standard" else "selective"


# ── prompt + tool-schema builders (rendered from the JSON, never hardcoded) ──


def build_rubric_prompt_block() -> str:
    """The rubric block of the scoring system prompt. MIRROR: rubric.ts renders
    the identical text."""
    lines: List[str] = []
    for cat in RUBRIC["categories"]:
        lines.append(f"# {cat['displayName']} ({cat['weightPercent']}% of the composite)")
        for sub in cat["subCriteria"]:
            a = sub["anchors"]
            lines.append(
                f"- [{sub['key']}] {sub['displayName']} — Below (1-2): {a['below']} "
                f"| Meets (3): {a['meets']} | Exceeds (4-5): {a['exceeds']}"
            )
        lines.append("")
    return "\n".join(lines).rstrip()


def build_rubric_scores_tool_schema() -> Dict[str, Any]:
    """JSON Schema for the `rubric_scores` tool property: one required object
    per sub-criterion, {score: 1-5 integer, evidence: string|null}."""
    properties: Dict[str, Any] = {}
    for cat in RUBRIC["categories"]:
        for sub in cat["subCriteria"]:
            properties[sub["key"]] = {
                "type": "object",
                "description": f"{sub['displayName']} ({cat['displayName']})",
                "properties": {
                    "score": {"type": "integer", "minimum": 1, "maximum": 5},
                    "evidence": {
                        "type": ["string", "null"],
                        "description": "Short verbatim transcript excerpt "
                        "justifying the score, or null if the interview "
                        "produced no evidence for it.",
                    },
                },
                "required": ["score", "evidence"],
            }
    return {
        "type": "object",
        "description": "Score EVERY sub-criterion of the rubric, 1-5, with an "
        "evidence quote.",
        "properties": properties,
        "required": ALL_SUB_CRITERION_KEYS,
    }


# ── decision engine (deterministic, no model) ────────────────────────────────


def _round1(x: float) -> float:
    """Round half-up to 1 decimal — mirrored exactly in rubric.ts (round1).
    (Python's round() is banker's rounding, hence the explicit floor form.)"""
    return math.floor(x * 10 + 0.5) / 10


def _band_for(composite: float) -> str:
    bands = sorted(RUBRIC["scoreBands"], key=lambda b: b["min"], reverse=True)
    for band in bands:
        if composite >= band["min"]:
            return band["key"]
    return bands[-1]["key"]


def decide_outcome(
    scores: Dict[str, Dict[str, Any]],
    *,
    passing_bar: str,
    must_have_keys: List[str],
    integrity_flag: Optional[str] = None,
) -> Dict[str, Any]:
    """Turn the model's per-sub-criterion scores into the final outcome.

    ``scores`` maps every rubric sub-criterion key to {"score": int 1-5,
    "evidence": str|None} (validated by the caller against the model output).
    ``integrity_flag`` is a DORMANT hook — no integrity detection exists yet,
    so callers never pass it; when detection lands, a truthy reason string
    caps the verdict at fail via the integrity gate.
    """
    # 1. Category scores: mean of sub-criterion scores (1-5).
    category_scores: Dict[str, float] = {}
    for cat in RUBRIC["categories"]:
        sub_scores = [scores[sub["key"]]["score"] for sub in cat["subCriteria"]]
        category_scores[cat["key"]] = sum(sub_scores) / len(sub_scores)

    # 2. Composite via the selected passing curve.
    #    selective: sum (weight/sum_weights) * ((categoryScore-1)/4) * 100
    selective = sum(
        (cat["weight"] / _SUM_OF_WEIGHTS)
        * ((category_scores[cat["key"]] - 1) / 4)
        * 100
        for cat in RUBRIC["categories"]
    )
    #    standard: x <= 50 -> 1.4*x ; x > 50 -> 70 + 0.6*(x-50)
    if passing_bar == "standard":
        raw = 1.4 * selective if selective <= 50 else 70 + 0.6 * (selective - 50)
    else:
        raw = selective
    composite = _round1(raw)

    # 3. Band.
    verdict_before_gates = _band_for(composite)

    # 4. Hard gates — verdict caps, applied after banding.
    gates_fired: List[Dict[str, Any]] = []

    comm_score = category_scores["communication"]
    comm100 = _round1((comm_score - 1) / 4 * 100)
    if comm100 <= 20:
        gates_fired.append(
            {
                "gate": "communication_floor",
                "capsVerdictAt": "fail",
                "categoryScore": comm_score,
                "categoryScore100": comm100,
            }
        )

    low_must_haves = [
        {"key": k, "score": scores[k]["score"]}
        for k in must_have_keys
        if k in scores and scores[k]["score"] <= 2
    ]
    if low_must_haves:
        gates_fired.append(
            {
                "gate": "must_have_below_bar",
                "capsVerdictAt": "borderline",
                "criteria": low_must_haves,
            }
        )

    # Integrity gate: DORMANT. Nothing sets integrity_flag yet; the hook exists
    # so a future integrity detector only has to supply a reason string.
    if integrity_flag:
        gates_fired.append(
            {"gate": "integrity", "capsVerdictAt": "fail", "reason": integrity_flag}
        )

    verdict = verdict_before_gates
    for gate in gates_fired:
        if _VERDICT_RANK[gate["capsVerdictAt"]] < _VERDICT_RANK[verdict]:
            verdict = gate["capsVerdictAt"]

    # 5. Legacy contract.
    passed = verdict in ("pass", "strong_pass")

    return {
        "category_scores": category_scores,
        "composite": composite,
        "passing_bar": passing_bar,
        "verdict_before_gates": verdict_before_gates,
        "verdict": verdict,
        "gates_fired": gates_fired,
        "passed": passed,
        "tier": _VERDICT_TIER[verdict],
        "legacy_score": composite / 100,
    }


def build_rubric_scores_json(
    scores: Dict[str, Dict[str, Any]], decision: Dict[str, Any]
) -> Dict[str, Any]:
    """The full breakdown persisted to InterviewResult.rubricScoresJson —
    includes display names + weights (snapshotted from the rubric) and which
    bar applied, so the Session-3 views can render without re-joining the
    rubric config."""
    return {
        "rubricKey": RUBRIC["key"],
        "rubricVersion": RUBRIC["version"],
        "passingBar": decision["passing_bar"],
        "verdictBeforeGates": decision["verdict_before_gates"],
        "categories": [
            {
                "key": cat["key"],
                "displayName": cat["displayName"],
                "weight": cat["weight"],
                "weightPercent": cat["weightPercent"],
                "categoryScore": decision["category_scores"][cat["key"]],
                "subCriteria": [
                    {
                        "key": sub["key"],
                        "displayName": sub["displayName"],
                        "score": scores[sub["key"]]["score"],
                        "evidence": scores[sub["key"]]["evidence"],
                    }
                    for sub in cat["subCriteria"]
                ],
            }
            for cat in RUBRIC["categories"]
        ],
    }
