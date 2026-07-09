"""Persist an interview transcript + a REAL fit evaluation to Supabase (2.3).

Phase 2.2c mocked the score/tier. Phase 2.3 replaces that with a real Claude
evaluation of the transcript (see ``evaluate.py``): the returned score, tier,
pass/fail, and qualitative fields (summary/strengths/concerns/recommendation)
are written to ``interview_results`` along with the raw fit signals the AI noted
during the conversation.

SYNCHRONOUS (supabase-py + the Anthropic SDK are both sync) — call it from async
code via ``asyncio.to_thread(...)``. See agent.py.

Gotchas worth remembering:
  * PostgREST inserts hit raw Postgres, so Prisma's application-side
    ``@default(cuid())`` does NOT apply — the ``id`` column has no DB default
    and is NOT NULL, so we MUST supply one. ``completedAt`` DOES have a DB
    default but we set it explicitly for accuracy.
  * Column names are camelCase (see load_context.py for why).
  * The JSON columns (strengthsJson/concernsJson/fitSignalsJson) accept Python
    lists directly — postgrest-py serializes them to JSONB.
  * Application status is driven by the evaluation's ``passed`` flag (Claude's
    call), NOT the old mechanical LEVEL_RANK rule.
"""

from __future__ import annotations

import logging
import secrets
import time
from datetime import datetime, timezone
from typing import Any, Dict, List

from .context import InterviewContext
from .evaluate import EvaluationResult, evaluate_interview, fallback_evaluation
from .supabase_client import supabase

logger = logging.getLogger("jbu-voice-agent.save")


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


def _evidence_to_json(items) -> List[Dict[str, str]]:
    return [item.model_dump() for item in items]


def mark_interview_completed(application_id: str) -> None:
    """Flip an application to ``interview_completed`` the instant the interview
    ends — BEFORE the (slow) Claude grading call.

    This is the durable "interview happened, grading in flight" signal the
    candidate result page relies on to show a "Finalizing…" pending state
    instead of bouncing the candidate back into a brand-new interview. It runs
    fast (a single PostgREST update, no LLM), so the browser — which navigates
    to the result page immediately on disconnect — sees the new status right
    away. SYNCHRONOUS; call via ``asyncio.to_thread`` like the save.
    """
    completed_at = datetime.now(timezone.utc).isoformat()
    supabase.table("applications").update(
        {"status": "interview_completed", "updatedAt": completed_at}
    ).eq("id", application_id).execute()


def save_interview_result(
    *,
    context: InterviewContext,
    transcript_text: str,
    fit_signals: List[Dict[str, Any]],
) -> Dict[str, object]:
    """Grade the interview, insert the InterviewResult, update the Application.

    Returns a small summary dict. Raises only on Supabase errors — the caller
    logs and swallows so a save failure never crashes the room close. The
    grading step itself never raises (it falls back internally).
    """
    application_id = context.application_id

    try:
        evaluation = evaluate_interview(context, transcript_text, fit_signals)
    except Exception:  # noqa: BLE001 — evaluate_interview shouldn't raise, but be safe.
        logger.exception("Unexpected error during evaluation; using fallback.")
        evaluation = fallback_evaluation()

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
            "score": evaluation.fit_score,
            "tier": evaluation.tier,
            "transcript": transcript_text,
            "completedAt": completed_at,
            "passed": evaluation.passed,
            "fitSummary": evaluation.fit_summary,
            "strengthsJson": _evidence_to_json(evaluation.strengths),
            "concernsJson": _evidence_to_json(evaluation.concerns),
            "recommendation": evaluation.recommendation,
            "fitSignalsJson": fit_signals,
        }
    ).execute()

    supabase.table("applications").update(
        {
            "status": "passed" if evaluation.passed else "failed",
            "updatedAt": completed_at,
        }
    ).eq("id", application_id).execute()

    logger.info(
        "Interview saved for application %s (tier=%s, score=%.2f, %s, rec=%s, "
        "%d strengths, %d concerns, %d signals)",
        application_id,
        evaluation.tier,
        evaluation.fit_score,
        "passed" if evaluation.passed else "failed",
        evaluation.recommendation,
        len(evaluation.strengths),
        len(evaluation.concerns),
        len(fit_signals),
    )
    return {
        "score": evaluation.fit_score,
        "tier": evaluation.tier,
        "passed": evaluation.passed,
        "recommendation": evaluation.recommendation,
    }
