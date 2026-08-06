"""Rubric evaluation of a basic (LiveKit) interview via Claude.

Phase 2.3 replaced the mocked score/tier with a real fit evaluation; this
session replaces that free-form judgment with RUBRIC scoring: given the full
interview context (job + candidate), the serialized transcript, and the fit
signals the voice AI noted in real-time, Claude scores every sub-criterion of
shared/interview-rubric.json 1-5 with an evidence quote. Everything
decision-shaped — category scores, the 0-100 composite via the job's passing
bar, the verdict band, hard gates, and the legacy passed/tier/score fields —
is computed DETERMINISTICALLY by rubric.py#decide_outcome, never by the model.

MIRROR: lib/ai/evaluate-interview.ts is the advanced-path twin of this module
(same model, same system prompt, same tool schema, same user-content assembly,
same 2-attempt retry + neutral fallback). If you change one, change the other.

Synchronous by design (the Anthropic SDK is called with the sync client) — the
caller runs it off the event loop via ``asyncio.to_thread`` alongside the rest
of ``save_result``. Any failure degrades to a neutral fallback (rubric fields
None) so the ``interview_results`` row is ALWAYS written and the dashboards
never break.
"""

from __future__ import annotations

import logging
import os
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field, ValidationError

from .context import InterviewContext
from .rubric import (
    ALL_SUB_CRITERION_KEYS,
    build_rubric_prompt_block,
    build_rubric_scores_json,
    build_rubric_scores_tool_schema,
    decide_outcome,
    resolve_must_have_keys,
    resolve_passing_bar,
)

logger = logging.getLogger("jbu-voice-agent.evaluate")

# Same model the Phase 2.1 question generator uses (lib/ai/anthropic.ts).
EVAL_MODEL = "claude-sonnet-4-6"
_MAX_RESUME_CHARS = 8000
_MAX_RETRIES = 2  # total attempts at the structured call before falling back
# 20 sub-scores with evidence quotes + the qualitative summary need headroom.
_MAX_TOKENS = 4000


# ── output schemas ───────────────────────────────────────────────────────────


class EvidenceItem(BaseModel):
    dimension: str  # e.g. "technical_depth", "communication", "motivation"
    evidence: str  # one-sentence summary
    impact: Literal["positive", "negative"]


class SubScore(BaseModel):
    score: int = Field(ge=1, le=5)
    evidence: Optional[str] = None


class _ModelOutput(BaseModel):
    """What the MODEL returns via the forced tool. The decision-shaped fields
    (composite/verdict/passed/tier/score) are deliberately absent — they are
    computed in code from rubric_scores."""

    rubric_scores: Dict[str, SubScore]
    fit_summary: str  # one paragraph, ~3-5 sentences
    strengths: List[EvidenceItem] = Field(default_factory=list)
    concerns: List[EvidenceItem] = Field(default_factory=list)
    recommendation: Literal["hire", "consider", "pass"]


class EvaluationResult(BaseModel):
    """What save_result persists. Legacy fields keep their existing
    names/semantics (backward-compatible displays); the rubric fields are None
    exactly when the evaluation fell back (no rubric scoring happened)."""

    fit_score: float = Field(ge=0.0, le=1.0)  # legacy 0-1 `score` = composite/100
    tier: Literal["entry", "novice", "advanced", "expert"]
    passed: bool  # verdict is pass/strong_pass
    fit_summary: str
    strengths: List[EvidenceItem] = Field(default_factory=list)
    concerns: List[EvidenceItem] = Field(default_factory=list)
    recommendation: Literal["hire", "consider", "pass"]
    rubric_scores_json: Optional[Dict[str, Any]] = None
    composite_score: Optional[float] = None  # 0-100, per the job's passing bar
    verdict: Optional[Literal["strong_pass", "pass", "borderline", "fail"]] = None
    gates_fired: Optional[List[Dict[str, Any]]] = None


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
        rubric_scores_json=None,
        composite_score=None,
        verdict=None,
        gates_fired=None,
    )


# ── the Claude call (system prompt + tool schema mirrored in rubric.ts /
#    evaluate-interview.ts) ───────────────────────────────────────────────────

_SYSTEM_PROMPT = (
    "You are grading a voice-only job interview for the specific role described, "
    "scoring the candidate against a fixed rubric. Score STRICTLY against the "
    "rubric anchors below — not against vibes or your own standards. Be honest "
    "and direct; base every score on evidence from the transcript, not sympathy.\n\n"
    "SCORING SCALE — every sub-criterion gets an integer score 1-5:\n"
    "  1-2 = Below the anchor\n"
    "  3   = Meets the anchor\n"
    "  4-5 = Exceeds the anchor\n\n"
    "RUBRIC:\n\n"
    + build_rubric_prompt_block()
    + "\n\n"
    "EVIDENCE RULES:\n"
    "- For every sub-criterion, `evidence` is a short verbatim excerpt from the "
    "transcript (the candidate's own words) that justifies the score.\n"
    "- NEVER fabricate, embellish, or paraphrase a quote that is not actually in "
    "the transcript. If the interview genuinely produced no evidence for a "
    "sub-criterion, set its `evidence` to null and score conservatively — a "
    "sub-criterion with no evidence must not score above 3.\n\n"
    "ATTRIBUTE-BLIND GRADING:\n"
    "Ignore the candidate's name, accent, dialect, gender, age, ethnicity, "
    "nationality, and every other personal attribute. Grade only what was "
    "demonstrated: the content of the answers and how clearly the ideas were "
    "communicated. Imperfect grammar or a non-native accent is NOT a "
    "communication weakness — clarity of ideas is what counts.\n\n"
    "Alongside the rubric scores, also produce the human-readable summary: "
    "fit_summary (one paragraph, 3-5 sentences, on overall fit for THIS role), "
    "strengths (2-5 positive evidence items), concerns (0-5 negative evidence "
    "items), and recommendation (hire / consider / pass).\n\n"
    "The transcript may end with a closing segment where the CANDIDATE asks "
    "questions about the role or the company and the interviewer answers them. "
    "Disregard that closing segment entirely — do not score it under any "
    "sub-criterion, positively or negatively."
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
    "description": "Submit your structured rubric evaluation of the candidate.",
    "input_schema": {
        "type": "object",
        "properties": {
            "rubric_scores": build_rubric_scores_tool_schema(),
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
            "rubric_scores",
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
    """Assemble every field Claude needs to grade the interview, as one prompt string."""
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
    """Grade the interview with Claude against the shared rubric. Never raises
    — falls back on any error (rubric fields None)."""
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
    passing_bar = resolve_passing_bar(context.job.passing_bar)
    must_have_keys = resolve_must_have_keys(context.job.must_have_criteria)

    last_error: Optional[Exception] = None
    for attempt in range(1, _MAX_RETRIES + 1):
        try:
            resp = client.messages.create(
                model=EVAL_MODEL,
                max_tokens=_MAX_TOKENS,
                system=_SYSTEM_PROMPT,
                tools=[_EVAL_TOOL],
                tool_choice={"type": "tool", "name": "submit_evaluation"},
                messages=[{"role": "user", "content": user_content}],
            )
            tool_input = _extract_tool_input(resp)
            if tool_input is None:
                raise ValueError("No submit_evaluation tool_use block in response.")
            model_output = _ModelOutput(**tool_input)

            # Every rubric sub-criterion must be scored; a missing key fails
            # the attempt (and triggers the retry). Blank evidence → None.
            scores: Dict[str, Dict[str, Any]] = {}
            for key in ALL_SUB_CRITERION_KEYS:
                sub = model_output.rubric_scores.get(key)
                if sub is None:
                    raise ValueError(
                        f"rubric_scores is missing sub-criterion {key!r}."
                    )
                evidence = (sub.evidence or "").strip() or None
                scores[key] = {"score": sub.score, "evidence": evidence}

            decision = decide_outcome(
                scores, passing_bar=passing_bar, must_have_keys=must_have_keys
            )

            logger.info(
                "Evaluation ok (attempt %d): composite=%.1f bar=%s verdict=%s "
                "gates=%d passed=%s rec=%s",
                attempt,
                decision["composite"],
                decision["passing_bar"],
                decision["verdict"],
                len(decision["gates_fired"]),
                decision["passed"],
                model_output.recommendation,
            )
            return EvaluationResult(
                fit_score=decision["legacy_score"],
                tier=decision["tier"],
                passed=decision["passed"],
                fit_summary=model_output.fit_summary,
                strengths=model_output.strengths,
                concerns=model_output.concerns,
                recommendation=model_output.recommendation,
                rubric_scores_json=build_rubric_scores_json(scores, decision),
                composite_score=decision["composite"],
                verdict=decision["verdict"],
                gates_fired=decision["gates_fired"],
            )
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
