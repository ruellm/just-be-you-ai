"""Phase 2.3 — real fit evaluation of an interview via Claude.

Replaces the Phase 2.2c mocked random score/tier. Given the full interview
context (job + candidate), the serialized transcript, and the fit signals the
voice AI noted in real-time, this asks Claude to judge whether the candidate is
a FIT for this specific role and return a structured evaluation.

Synchronous by design (the Anthropic SDK is called with the sync client) — the
caller runs it off the event loop via ``asyncio.to_thread`` alongside the rest
of ``save_result``. Any failure degrades to a neutral fallback so the
``interview_results`` row is ALWAYS written and the dashboards never break.
"""

from __future__ import annotations

import logging
import os
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field, ValidationError

from .context import InterviewContext

logger = logging.getLogger("jbu-voice-agent.evaluate")

# Same model the Phase 2.1 question generator uses (lib/ai/anthropic.ts).
EVAL_MODEL = "claude-sonnet-4-6"
_MAX_RESUME_CHARS = 8000
_MAX_RETRIES = 2  # total attempts at the structured call before falling back


# ── output schema ────────────────────────────────────────────────────────────


class EvidenceItem(BaseModel):
    dimension: str  # e.g. "technical_depth", "communication", "motivation"
    evidence: str  # one-sentence summary
    impact: Literal["positive", "negative"]


class EvaluationResult(BaseModel):
    fit_score: float = Field(ge=0.0, le=1.0)
    tier: Literal["entry", "novice", "advanced", "expert"]
    passed: bool
    fit_summary: str  # one paragraph, ~3-5 sentences
    strengths: List[EvidenceItem] = Field(default_factory=list)
    concerns: List[EvidenceItem] = Field(default_factory=list)
    recommendation: Literal["hire", "consider", "pass"]


def fallback_evaluation() -> EvaluationResult:
    """Neutral result used when the Claude call fails (req B.5)."""
    return EvaluationResult(
        fit_score=0.5,
        tier="novice",
        passed=False,
        fit_summary="Evaluation failed — please review the transcript manually.",
        strengths=[],
        concerns=[],
        recommendation="consider",
    )


# ── the Claude call ──────────────────────────────────────────────────────────

_SYSTEM_PROMPT = (
    "You are grading a job interview to determine candidate FIT for the specific "
    "role described. Your job is NOT to grade quiz answers. Judge whether this "
    "candidate would be effective in this specific job based on everything you "
    "know: their resume, their profile, the job requirements, the ideal candidate "
    "profile, the passing criteria, the interview transcript, and the fit signals "
    "the interviewer noted in real-time. Be honest and direct. If the candidate is "
    "a poor fit, say so clearly. If they're strong, say so clearly. Base your "
    "judgment on evidence, not sympathy.\n\n"
    "Tier maps to overall fit level:\n"
    "  - entry: minimal fit / clearly not ready\n"
    "  - novice: some fit signals but significant gaps\n"
    "  - advanced: strong fit with minor concerns\n"
    "  - expert: exceptional fit across all dimensions\n"
    "Decide the tier from the overall evidence — do not compute it mechanically "
    "from the score. Set `passed` to true ONLY if you would recommend advancing "
    "this candidate to the next round of a real hiring process.\n\n"
    # The interview now ends with a closing candidate-questions segment (the
    # candidate asking about the role/company); it must not affect grading.
    "The transcript may end with a closing segment where the CANDIDATE asks "
    "questions about the role or the company and the interviewer answers them. "
    "Base your fit judgment ONLY on the interview/assessment portion of the "
    "conversation and disregard that closing candidate-questions segment "
    "entirely. Whether the candidate asks questions — and what they ask — must "
    "not be scored as a positive or negative fit signal. It is not part of the "
    "assessment."
)

_EVIDENCE_ITEM_SCHEMA = {
    "type": "object",
    "properties": {
        "dimension": {
            "type": "string",
            "description": "Short fit dimension, e.g. 'technical_depth', "
            "'communication', 'motivation', 'problem_solving', 'domain_experience'.",
        },
        "evidence": {
            "type": "string",
            "description": "One-sentence summary of the supporting evidence.",
        },
        "impact": {"type": "string", "enum": ["positive", "negative"]},
    },
    "required": ["dimension", "evidence", "impact"],
}

_EVAL_TOOL = {
    "name": "submit_evaluation",
    "description": "Submit your structured fit evaluation of the candidate.",
    "input_schema": {
        "type": "object",
        "properties": {
            "fit_score": {
                "type": "number",
                "description": "Overall fit, 0.0 (no fit) to 1.0 (perfect fit).",
            },
            "tier": {
                "type": "string",
                "enum": ["entry", "novice", "advanced", "expert"],
            },
            "passed": {
                "type": "boolean",
                "description": "True only if you'd advance them to the next round.",
            },
            "fit_summary": {
                "type": "string",
                "description": "One paragraph (3-5 sentences) on overall fit.",
            },
            "strengths": {
                "type": "array",
                "items": _EVIDENCE_ITEM_SCHEMA,
                "description": "2-5 positive-impact evidence items.",
            },
            "concerns": {
                "type": "array",
                "items": _EVIDENCE_ITEM_SCHEMA,
                "description": "0-5 negative-impact evidence items.",
            },
            "recommendation": {
                "type": "string",
                "enum": ["hire", "consider", "pass"],
            },
        },
        "required": [
            "fit_score",
            "tier",
            "passed",
            "fit_summary",
            "strengths",
            "concerns",
            "recommendation",
        ],
    },
}


def _truncate(text: Optional[str], limit: int) -> str:
    if not text:
        return ""
    text = text.strip()
    return text if len(text) <= limit else text[:limit] + "…[truncated]"


def _build_user_content(
    context: InterviewContext, transcript: str, fit_signals: List[Dict[str, Any]]
) -> str:
    """Assemble every field Claude needs to judge fit, as one prompt string."""
    job = context.job
    cand = context.candidate

    skills = ", ".join(
        f"{s.name}"
        + (f" ({s.years_of_experience}y)" if s.years_of_experience else "")
        for s in cand.skills
    ) or "None listed"

    if cand.work_experiences:
        work_lines = []
        for w in cand.work_experiences:
            span = "current" if w.currently_working else (w.end_date or "")
            header = f"- {w.position} at {w.company_name}"
            if span:
                header += f" ({span})"
            work_lines.append(header)
            if w.description:
                work_lines.append(f"    {w.description.strip()}")
        work = "\n".join(work_lines)
    else:
        work = "None listed"

    if fit_signals:
        signal_lines = [
            f"- [{s.get('strength', '?')}] {s.get('dimension', '?')}: "
            f"{s.get('evidence', '')}"
            for s in fit_signals
        ]
        signals = "\n".join(signal_lines)
    else:
        signals = "None noted during the interview."

    return (
        "# JOB\n"
        f"Title: {job.title}\n"
        f"Company: {job.company_name}\n"
        f"Level required: {job.level or 'unspecified'}\n"
        f"Description: {_truncate(job.description, 2000) or 'N/A'}\n"
        f"Role overview: {_truncate(job.role_overview, 1500) or 'N/A'}\n"
        f"Requirements: {_truncate(job.requirements, 1500) or 'N/A'}\n"
        f"Day-to-day: {_truncate(job.day_to_day, 1000) or 'N/A'}\n"
        f"Ideal candidate profile: {_truncate(job.ideal_candidate_profile, 1500) or 'N/A'}\n"
        f"Passing criteria: {_truncate(job.passing_criteria, 1500) or 'N/A'}\n"
        f"Interviewer hints: {_truncate(job.interview_hints, 1500) or 'N/A'}\n\n"
        "# CANDIDATE\n"
        f"Name: {cand.full_name}\n"
        f"Preferred role: {cand.preferred_role or 'N/A'}\n"
        f"Total years experience: {cand.total_years_experience if cand.total_years_experience is not None else 'N/A'}\n"
        f"Summary: {_truncate(cand.summary, 1500) or 'N/A'}\n"
        f"Skills: {skills}\n"
        f"Work experience:\n{work}\n\n"
        f"Parsed resume text:\n{_truncate(cand.parsed_resume_text, _MAX_RESUME_CHARS) or 'N/A'}\n\n"
        "# INTERVIEW TRANSCRIPT\n"
        f"{transcript or '(empty — the candidate said little or nothing)'}\n\n"
        "# FIT SIGNALS NOTED BY THE INTERVIEWER IN REAL-TIME\n"
        f"{signals}\n\n"
        "Return your evaluation in the required structured format via the "
        "submit_evaluation tool."
    )


def evaluate_interview(
    context: InterviewContext,
    transcript: str,
    fit_signals: List[Dict[str, Any]],
) -> EvaluationResult:
    """Grade the interview with Claude. Never raises — falls back on any error."""
    if not os.environ.get("ANTHROPIC_API_KEY"):
        logger.error("ANTHROPIC_API_KEY not set; using fallback evaluation.")
        return fallback_evaluation()

    try:
        # Imported lazily so a missing/old anthropic package doesn't break import.
        from anthropic import Anthropic
    except Exception:  # noqa: BLE001
        logger.exception("anthropic SDK unavailable; using fallback evaluation.")
        return fallback_evaluation()

    client = Anthropic()  # reads ANTHROPIC_API_KEY
    user_content = _build_user_content(context, transcript, fit_signals)

    last_error: Optional[Exception] = None
    for attempt in range(1, _MAX_RETRIES + 1):
        try:
            resp = client.messages.create(
                model=EVAL_MODEL,
                max_tokens=1500,
                system=_SYSTEM_PROMPT,
                tools=[_EVAL_TOOL],
                tool_choice={"type": "tool", "name": "submit_evaluation"},
                messages=[{"role": "user", "content": user_content}],
            )
            tool_input = _extract_tool_input(resp)
            if tool_input is None:
                raise ValueError("No submit_evaluation tool_use block in response.")
            result = EvaluationResult(**tool_input)
            logger.info(
                "Evaluation ok (attempt %d): tier=%s score=%.2f passed=%s rec=%s",
                attempt,
                result.tier,
                result.fit_score,
                result.passed,
                result.recommendation,
            )
            return result
        except (ValidationError, ValueError) as exc:
            last_error = exc
            logger.warning("Evaluation attempt %d invalid: %s", attempt, exc)
        except Exception as exc:  # noqa: BLE001 — network/API errors
            last_error = exc
            logger.warning("Evaluation attempt %d failed: %s", attempt, exc)

    logger.error("Evaluation failed after %d attempts (%s); using fallback.",
                 _MAX_RETRIES, last_error)
    return fallback_evaluation()


def _extract_tool_input(resp) -> Optional[Dict[str, Any]]:
    """Pull the submit_evaluation tool input out of a Messages response."""
    for block in getattr(resp, "content", []) or []:
        if getattr(block, "type", None) == "tool_use" and getattr(
            block, "name", None
        ) == "submit_evaluation":
            return getattr(block, "input", None)
    return None
