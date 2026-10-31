"""Pre-screening interview defaults, read from shared/prescreen.json.

A pre-screen is an application with no job. The agent and the evaluator read
job fields, so this builds the same stand-in job the Next.js side builds in
lib/prescreen.ts: the candidate's preferred role (else their latest position,
else the fallback title) plus the shared description, company name and
duration.

MIRROR: lib/prescreen.ts. If you change one, change the other. The values
live ONLY in the shared JSON.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict

from .context import CandidateContext, JobContext

_PRESCREEN_PATH = (
    Path(__file__).resolve().parents[2] / "shared" / "prescreen.json"
)

with _PRESCREEN_PATH.open("r", encoding="utf-8") as _f:
    PRESCREEN: Dict[str, Any] = json.load(_f)


def prescreen_job_title(candidate: CandidateContext) -> str:
    preferred = (candidate.preferred_role or "").strip()
    if preferred:
        return preferred
    # Loaders keep work experiences most recent first.
    if candidate.work_experiences:
        latest = (candidate.work_experiences[0].position or "").strip()
        if latest:
            return latest
    return str(PRESCREEN["titleFallback"])


def build_prescreen_job(candidate: CandidateContext) -> JobContext:
    title = prescreen_job_title(candidate)
    return JobContext(
        title=title,
        description=PRESCREEN["description"],
        level=PRESCREEN["level"],
        ideal_candidate_profile=str(PRESCREEN["idealCandidateProfile"]).replace(
            "{title}", title
        ),
        interview_max_minutes=int(PRESCREEN["durationMinutes"]),
        passing_bar=None,
        must_have_criteria=None,
        company_name=str(PRESCREEN["companyName"]),
        is_prescreen=True,
    )


def prescreen_greeting() -> str:
    return str(PRESCREEN["greeting"])
