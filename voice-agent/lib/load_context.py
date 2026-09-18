"""Load a full InterviewContext for one application from Supabase.

This is a SYNCHRONOUS function — the supabase-py client is sync (it wraps
httpx's sync API). Call it from async code via `asyncio.to_thread(...)` so the
blocking network I/O doesn't stall the LiveKit event loop. See agent.py.

Design notes / decisions:
  * One round-trip. PostgREST embedded selects pull the candidate profile, its
    user, skills (+ skill names), work experiences, the job (+ company), and the
    generated questions in a single request — no N+1.
  * Column names are camelCase. The Prisma models use snake_case TABLE names
    (@@map) but leave column names as-is (no @map), so Postgres columns are
    "candidateProfileId", "firstName", "parsedResumeText", etc. PostgREST is
    case-sensitive, so these must be spelled exactly.
  * Embeds are unambiguous (one FK per pair), so no `!hint` disambiguation is
    needed. We only alias them for readable keys.
  * full_name is built from CandidateProfile.firstName/lastName (the User row
    carries no name — only email), falling back to the user's email.
  * Questions are sorted by `.order` in Python rather than via a PostgREST
    embedded order param, since the column is literally named "order".
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from .context import (
    CandidateContext,
    GeneratedQuestion,
    InterviewContext,
    JobContext,
    Skill,
    WorkExperience,
)
from .supabase_client import supabase

# Embedded select tree. Keys before ":" are the aliases we read back below.
_SELECT = """
id,
resumeSnapshotAt,
appliedParsedResumeText,
appliedCleanedResumeText,
candidate:candidate_profiles(
    firstName,
    lastName,
    country,
    city,
    summary,
    parsedResumeText,
    cleanedResumeText,
    languages,
    totalYearsExperience,
    preferredRole,
    user:users(email),
    skills:candidate_skills(
        yearsOfExperience,
        skill:skills(name, category)
    ),
    workExperiences:work_experiences(
        position,
        companyName,
        employmentType,
        description,
        startDate,
        endDate,
        currentlyWorking
    )
),
job:jobs(
    title,
    description,
    roleOverview,
    requirements,
    dayToDay,
    level,
    workMode,
    interviewHints,
    idealCandidateProfile,
    passingCriteria,
    interviewMaxMinutes,
    passingBar,
    mustHaveCriteriaJson,
    company:companies(name)
),
questions:generated_questions(
    order,
    category,
    text,
    rationale
)
"""


def load_interview_context(application_id: str) -> InterviewContext:
    """Fetch and assemble the InterviewContext for ``application_id``.

    Raises ValueError if the application (or its required relations) is missing.
    """
    resp = (
        supabase.table("applications")
        .select(_SELECT)
        .eq("id", application_id)
        .limit(1)
        .execute()
    )

    rows: List[Dict[str, Any]] = resp.data or []
    if not rows:
        raise ValueError(f"Application not found: {application_id!r}")

    row = rows[0]

    candidate_row = row.get("candidate")
    if not candidate_row:
        raise ValueError(
            f"Application {application_id!r} has no candidate profile attached."
        )

    job_row = row.get("job")
    if not job_row:
        raise ValueError(f"Application {application_id!r} has no job attached.")

    candidate = _build_candidate(candidate_row)
    _resolve_resume(row, candidate)
    job = _build_job(job_row)
    questions = _build_questions(row.get("questions") or [])

    return InterviewContext(
        application_id=application_id,
        candidate=candidate,
        job=job,
        questions=questions,
    )


def _resolve_resume(application_row: Dict[str, Any], candidate: CandidateContext) -> None:
    """Point the candidate's resume text at the apply-time SNAPSHOT.

    The interview prompt (interview_flow.py) and the evaluator (evaluate.py)
    both read ``candidate.parsed_resume_text`` / ``cleaned_resume_text``, so
    resolving here covers both. Without this a candidate could apply clean, get
    questions, then swap in a loaded resume before the interview is graded.

    MIRROR: lib/ai/resume-snapshot.ts#resolveApplicationResume.
    """
    if application_row.get("resumeSnapshotAt") is not None:
        # Snapshot rows are authoritative even where a field is None: None text
        # means the candidate applied with no resume, and must NOT fall through
        # to whatever they uploaded later.
        candidate.parsed_resume_text = application_row.get("appliedParsedResumeText")
        candidate.cleaned_resume_text = application_row.get("appliedCleanedResumeText")
        candidate.resume_source = "snapshot"
        return

    # PRE-SNAPSHOT FALLBACK, deliberate: applications created before the
    # snapshot columns existed have resumeSnapshotAt = NULL and were never
    # backfilled. For those rows only, keep the live profile text that
    # _build_candidate already loaded.
    candidate.resume_source = "profile"


def _build_candidate(row: Dict[str, Any]) -> CandidateContext:
    first = (row.get("firstName") or "").strip()
    last = (row.get("lastName") or "").strip()
    full_name = " ".join(part for part in (first, last) if part).strip()
    if not full_name:
        user = row.get("user") or {}
        full_name = user.get("email") or "Candidate"

    skills: List[Skill] = []
    for cs in row.get("skills") or []:
        skill = cs.get("skill") or {}
        name = skill.get("name")
        if not name:
            continue
        skills.append(
            Skill(
                name=name,
                category=skill.get("category"),
                years_of_experience=cs.get("yearsOfExperience"),
            )
        )

    work_experiences: List[WorkExperience] = []
    for we in row.get("workExperiences") or []:
        work_experiences.append(
            WorkExperience(
                position=we.get("position") or "",
                company_name=we.get("companyName") or "",
                employment_type=we.get("employmentType"),
                description=we.get("description"),
                start_date=we.get("startDate"),
                end_date=we.get("endDate"),
                currently_working=bool(we.get("currentlyWorking")),
            )
        )

    return CandidateContext(
        full_name=full_name,
        country=row.get("country"),
        city=row.get("city"),
        summary=row.get("summary"),
        parsed_resume_text=row.get("parsedResumeText"),
        cleaned_resume_text=row.get("cleanedResumeText"),
        languages=row.get("languages") or [],
        total_years_experience=row.get("totalYearsExperience"),
        preferred_role=row.get("preferredRole"),
        skills=skills,
        work_experiences=work_experiences,
    )


def _build_job(row: Dict[str, Any]) -> JobContext:
    company = row.get("company") or {}
    # mustHaveCriteriaJson is a free-form JSONB column — only accept a clean
    # list of strings; anything else degrades to None (= rubric default set)
    # instead of failing the whole context load.
    must_have = row.get("mustHaveCriteriaJson")
    if not (isinstance(must_have, list) and all(isinstance(k, str) for k in must_have)):
        must_have = None
    return JobContext(
        title=row.get("title") or "",
        description=row.get("description"),
        role_overview=row.get("roleOverview"),
        requirements=row.get("requirements"),
        day_to_day=row.get("dayToDay"),
        level=row.get("level"),
        work_mode=row.get("workMode"),
        interview_hints=row.get("interviewHints"),
        ideal_candidate_profile=row.get("idealCandidateProfile"),
        passing_criteria=row.get("passingCriteria"),
        interview_max_minutes=row.get("interviewMaxMinutes"),
        passing_bar=row.get("passingBar"),
        must_have_criteria=must_have,
        company_name=company.get("name") or "the company",
    )


def _build_questions(rows: List[Dict[str, Any]]) -> List[GeneratedQuestion]:
    questions = [
        GeneratedQuestion(
            order=q.get("order") or 0,
            category=q.get("category") or "core",
            text=q.get("text") or "",
            rationale=q.get("rationale"),
        )
        for q in rows
    ]
    questions.sort(key=lambda q: q.order)
    return questions
