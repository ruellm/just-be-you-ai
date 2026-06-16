"""Pydantic models describing the interview context loaded from Supabase.

Fields are snake_case because these objects are assembled from raw Postgres
rows in load_context.py. They are intentionally lenient (lots of Optionals)
so a half-filled candidate profile still loads instead of crashing the agent.
"""

from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field


class Skill(BaseModel):
    name: str
    category: Optional[str] = None
    years_of_experience: Optional[int] = None


class WorkExperience(BaseModel):
    position: str
    company_name: str
    employment_type: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    currently_working: bool = False


class CandidateContext(BaseModel):
    full_name: str
    country: Optional[str] = None
    city: Optional[str] = None
    summary: Optional[str] = None
    parsed_resume_text: Optional[str] = None
    languages: List[str] = Field(default_factory=list)
    total_years_experience: Optional[int] = None
    preferred_role: Optional[str] = None
    skills: List[Skill] = Field(default_factory=list)
    work_experiences: List[WorkExperience] = Field(default_factory=list)


class JobContext(BaseModel):
    title: str
    description: Optional[str] = None
    role_overview: Optional[str] = None
    requirements: Optional[str] = None
    day_to_day: Optional[str] = None
    level: Optional[str] = None
    work_mode: Optional[str] = None
    interview_hints: Optional[str] = None
    ideal_candidate_profile: Optional[str] = None
    passing_criteria: Optional[str] = None
    company_name: str


class GeneratedQuestion(BaseModel):
    order: int
    category: str
    text: str
    rationale: Optional[str] = None


class InterviewContext(BaseModel):
    application_id: str
    candidate: CandidateContext
    job: JobContext
    questions: List[GeneratedQuestion] = Field(default_factory=list)
