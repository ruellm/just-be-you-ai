"""Persist an interview transcript + a (mocked) result to Supabase.

Phase 2.2c keeps the score/tier MOCKED — same shape as the Phase 1 TypeScript
mock (`lib/mock-interview.ts`) so the existing business/candidate dashboards
keep rendering end-to-end. Phase 2.3 replaces the mock with real LLM grading.

This is a SYNCHRONOUS function (supabase-py is sync) — call it from async code
via ``asyncio.to_thread(...)`` like the context loader. See agent.py.

Gotchas worth remembering:
  * PostgREST inserts hit raw Postgres, so Prisma's application-side
    ``@default(cuid())`` does NOT apply — the ``id`` column has no DB default
    and is NOT NULL, so we MUST supply one. ``completedAt`` DOES have a DB
    default (CURRENT_TIMESTAMP) but we set it explicitly for accuracy.
  * Column names are camelCase (see load_context.py for why).
  * Per the Phase 1 lifecycle, finishing sets status straight to passed/failed
    (the transient ``interview_completed`` value is not persisted).
"""

from __future__ import annotations

import logging
import secrets
import time
from datetime import datetime, timezone
from typing import Dict

from .supabase_client import supabase

logger = logging.getLogger("jbu-voice-agent.save")

# Pass rule (mirrors lib/applications.ts LEVEL_RANK): pass when tier >= job level.
_LEVEL_RANK = {"entry": 0, "novice": 1, "advanced": 2, "expert": 3}

# Weighted tier distribution per the Phase 2.2c spec:
#   entry 10%, novice 30%, advanced 45%, expert 15%.
_TIER_THRESHOLDS = (("entry", 10), ("novice", 40), ("advanced", 85), ("expert", 100))


def _generate_id() -> str:
    """A cuid-like TEXT id ('c' + base36 time + random).

    The format isn't parsed anywhere; we only need a unique, NOT-NULL primary
    key because PostgREST inserts bypass Prisma's cuid() default.
    """
    millis = int(time.time() * 1000)
    return f"c{_to_base36(millis)}{secrets.token_hex(8)}"


def _to_base36(n: int) -> str:
    digits = "0123456789abcdefghijklmnopqrstuvwxyz"
    if n == 0:
        return "0"
    out = ""
    while n:
        n, rem = divmod(n, 36)
        out = digits[rem] + out
    return out


def _random_score() -> float:
    # 0.30 – 0.95, two decimals (matches lib/mock-interview.ts#randomScore).
    return round(0.3 + secrets.randbelow(66) / 100, 2)


def _random_tier() -> str:
    r = secrets.randbelow(100)  # 0..99
    for tier, threshold in _TIER_THRESHOLDS:
        if r < threshold:
            return tier
    return "advanced"


def save_interview_result(
    *, application_id: str, job_level: str | None, transcript_text: str
) -> Dict[str, object]:
    """Insert the InterviewResult and update the Application. Returns a summary.

    Raises on Supabase errors — the caller logs and swallows so a save failure
    never crashes the room close.
    """
    score = _random_score()
    tier = _random_tier()
    passed = _LEVEL_RANK[tier] >= _LEVEL_RANK.get(job_level or "entry", 0)
    completed_at = datetime.now(timezone.utc).isoformat()

    # Re-tests on the same application_id are common in the Playground, and
    # interview_results.applicationId is UNIQUE — clear any prior result first
    # so a repeat run is idempotent instead of erroring on the constraint.
    supabase.table("interview_results").delete().eq(
        "applicationId", application_id
    ).execute()

    supabase.table("interview_results").insert(
        {
            "id": _generate_id(),
            "applicationId": application_id,
            "score": score,
            "tier": tier,
            "transcript": transcript_text,
            "completedAt": completed_at,
        }
    ).execute()

    supabase.table("applications").update(
        {
            "status": "passed" if passed else "failed",
            "updatedAt": completed_at,
        }
    ).eq("id", application_id).execute()

    logger.info(
        "Interview saved for application %s (tier=%s, score=%.2f, %s)",
        application_id,
        tier,
        score,
        "passed" if passed else "failed",
    )
    return {"score": score, "tier": tier, "passed": passed}
