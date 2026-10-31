// Pre-screening interview: an Application with kind = prescreen and no job.
// The interview pipeline (question generation, both voice prompts, the
// evaluator) reads job fields, so a pre-screen gets a stand-in job built from
// the candidate's own profile and the values in shared/prescreen.json.
//
// MIRROR: voice-agent/lib/prescreen.py builds the same stand-in for the Python
// tier from the same JSON. If you change one, change the other.
//
// No `import "server-only"` and no Prisma import, so scripts can load it.

import prescreenJson from "@/shared/prescreen.json";

export const PRESCREEN = prescreenJson;

export const PRESCREEN_DISPLAY_TITLE: string = PRESCREEN.displayTitle;
export const PRESCREEN_DURATION_MINUTES: number = PRESCREEN.durationMinutes;
export const PRESCREEN_COMPLETE_PATH = "/candidate/prescreen/complete";

// The job fields the interview pipeline reads, flattened so a real Job row
// and the pre-screen stand-in look the same to the prompt builders.
export type InterviewJobView = {
  title: string;
  level: string | null;
  description: string | null;
  roleOverview: string | null;
  requirements: string | null;
  dayToDay: string | null;
  interviewHints: string | null;
  idealCandidateProfile: string | null;
  passingCriteria: string | null;
  passingBar: string | null;
  mustHaveCriteriaJson: unknown;
  interviewMaxMinutes: number | null;
  companyName: string;
  skillNames: string[];
  isPrescreen: boolean;
};

type JobSource = {
  title: string;
  level: string;
  description: string | null;
  roleOverview: string | null;
  requirements: string | null;
  dayToDay: string | null;
  interviewHints: string | null;
  idealCandidateProfile: string | null;
  passingCriteria: string | null;
  passingBar: string | null;
  mustHaveCriteriaJson: unknown;
  interviewMaxMinutes: number | null;
  skills?: { skill: { name: string } }[];
  company?: { name: string };
};

type CandidateSource = {
  preferredRole: string | null;
  // Most recent first, as every loader orders them.
  workExperiences?: { position: string }[];
  skills?: { skill: { name: string } }[];
};

export function prescreenJobTitle(candidate: CandidateSource): string {
  const preferred = candidate.preferredRole?.trim();
  if (preferred) return preferred;
  const latest = candidate.workExperiences?.[0]?.position?.trim();
  if (latest) return latest;
  return PRESCREEN.titleFallback;
}

export function prescreenJob(candidate: CandidateSource): InterviewJobView {
  const title = prescreenJobTitle(candidate);
  return {
    title,
    level: PRESCREEN.level,
    description: PRESCREEN.description,
    roleOverview: null,
    requirements: null,
    dayToDay: null,
    interviewHints: null,
    idealCandidateProfile: PRESCREEN.idealCandidateProfile.replace("{title}", title),
    passingCriteria: null,
    passingBar: null,
    mustHaveCriteriaJson: null,
    interviewMaxMinutes: PRESCREEN.durationMinutes,
    companyName: PRESCREEN.companyName,
    skillNames: candidate.skills?.map((s) => s.skill.name) ?? [],
    isPrescreen: true,
  };
}

// The job view for any application: the real job when there is one, the
// pre-screen stand-in otherwise.
export function resolveInterviewJob(app: {
  job: JobSource | null;
  candidateProfile: CandidateSource;
}): InterviewJobView {
  const job = app.job;
  if (!job) return prescreenJob(app.candidateProfile);
  return {
    title: job.title,
    level: job.level,
    description: job.description,
    roleOverview: job.roleOverview,
    requirements: job.requirements,
    dayToDay: job.dayToDay,
    interviewHints: job.interviewHints,
    idealCandidateProfile: job.idealCandidateProfile,
    passingCriteria: job.passingCriteria,
    passingBar: job.passingBar,
    mustHaveCriteriaJson: job.mustHaveCriteriaJson,
    interviewMaxMinutes: job.interviewMaxMinutes,
    companyName: job.company?.name || "the company",
    skillNames: job.skills?.map((s) => s.skill.name) ?? [],
    isPrescreen: false,
  };
}

// What a page shows where a job title would go.
export function applicationDisplayTitle(app: {
  job: { title: string } | null;
}): string {
  return app.job?.title ?? PRESCREEN_DISPLAY_TITLE;
}
