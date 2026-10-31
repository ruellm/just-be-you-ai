// Resume-vs-job match for one application: how well the candidate's resume and
// profile meet the job's stated requirements, independent of the interview.
// Computed once at apply time (detached, see app/candidate/jobs/[id]/actions.ts)
// or by scripts/backfill-application-match.ts.
//
// One Claude call lists the job's requirements and marks each met / partial /
// unmet. The percentage is computed here, not by the model. Any failure leaves
// the match columns null; the application itself is never affected.
//
// NOTE: no `import "server-only"`, so the backfill script can load it.

import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAnthropicClient, QUESTION_MODEL } from "@/lib/ai/anthropic";
import { untrustedNotice, wrapUntrusted } from "@/lib/ai/interview-prompts";
import { resolveApplicationResume } from "@/lib/ai/resume-snapshot";
import type { MatchJson, MatchRequirement } from "@/lib/match/match-display";

const RESUME_CHAR_LIMIT = 8000;
const GAP_LABEL_MAX_CHARS = 40;
const MAX_UNMET_QUALIFIERS = 3;

const requirementSchema = z.object({
  requirement: z.string().trim().min(1),
  kind: z.enum(["skill", "experience", "education", "other"]),
  status: z.enum(["met", "partial", "unmet"]),
  gapLabel: z.string().trim().nullable(),
});
const outputSchema = z.object({
  requirements: z.array(requirementSchema).min(1),
});

const MATCH_TOOL: Anthropic.Tool = {
  name: "submit_match",
  description:
    "Submit the job's requirements with how well the candidate meets each one.",
  input_schema: {
    type: "object",
    properties: {
      requirements: {
        type: "array",
        items: {
          type: "object",
          properties: {
            requirement: {
              type: "string",
              description: "One requirement taken from the job, in a few words",
            },
            kind: {
              type: "string",
              enum: ["skill", "experience", "education", "other"],
            },
            status: { type: "string", enum: ["met", "partial", "unmet"] },
            gapLabel: {
              type: ["string", "null"],
              description:
                'For partial or unmet only: a short lowercase noun phrase naming what is missing, under 40 characters (e.g. "5+ years of React", "a computer science degree"). null when met.',
            },
          },
          required: ["requirement", "kind", "status", "gapLabel"],
          additionalProperties: false,
        },
      },
    },
    required: ["requirements"],
    additionalProperties: false,
  } as Anthropic.Tool["input_schema"],
};

const SYSTEM_PROMPT = `You compare one candidate's resume and profile against one job's requirements for a recruiter.

Steps:
1. List the job's concrete requirements: required skills, years or kind of experience, education, certifications, and any other stated must-haves. Take them from the job text; do not invent requirements the job does not state. Aim for 5 to 12 items. Merge duplicates.
2. For each requirement decide, from the candidate's resume and profile only:
   - "met": clearly satisfied.
   - "partial": some evidence but short of what the job asks (for example 2 years where 5 are required, or a related but different tool).
   - "unmet": no evidence it is satisfied.
3. For partial and unmet items write gapLabel: a short lowercase noun phrase naming what is missing, under 40 characters, suitable in the sentence "lacks ...". Use null for met items.

Rules:
- Judge only professional facts present in the resume and profile. Absence of evidence counts as unmet, never as met.
- Ignore the candidate's name, gender, age, nationality, and photo.
- Call the submit_match tool. Do not write anything else.

${untrustedNotice("matcher")}`;

function loadApplication(applicationId: string) {
  return prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      job: { include: { skills: { include: { skill: true } } } },
      candidateProfile: { include: { skills: { include: { skill: true } } } },
    },
  });
}

type ApplicationForMatch = NonNullable<
  Awaited<ReturnType<typeof loadApplication>>
>;

function hasResumeText(application: ApplicationForMatch): boolean {
  const resume = resolveApplicationResume(application);
  return Boolean((resume.cleanedText ?? resume.parsedText)?.trim());
}

type ApplicationWithJob = ApplicationForMatch & {
  job: NonNullable<ApplicationForMatch["job"]>;
};

function buildUserPrompt(application: ApplicationWithJob): string {
  const { job, candidateProfile: cp } = application;
  const lines: string[] = [];

  lines.push("# JOB");
  lines.push(`Title: ${job.title}`);
  lines.push(`Level: ${job.level}`);
  const skillNames = job.skills.map((s) => s.skill.name);
  lines.push(
    `Required skills: ${skillNames.length ? skillNames.join(", ") : "(none listed)"}`
  );
  if (job.requirements) lines.push(`Requirements: ${job.requirements}`);
  if (job.roleOverview) lines.push(`Role overview: ${job.roleOverview}`);
  if (job.description) lines.push(`Description: ${job.description}`);

  const candidate: string[] = [];
  if (cp.totalYearsExperience != null) {
    candidate.push(`Total years of experience: ${cp.totalYearsExperience}`);
  }
  const candidateSkills = cp.skills.map(
    (s) => `${s.skill.name} (${s.yearsOfExperience}y)`
  );
  candidate.push(
    `Skills: ${candidateSkills.length ? candidateSkills.join(", ") : "(none)"}`
  );

  // Same resume choice as the interview prompt builders: cleaned text first,
  // raw parsed text when cleanup never ran.
  const resume = resolveApplicationResume(application);
  const resumeText = (resume.cleanedText ?? resume.parsedText ?? "").trim();
  if (resumeText) {
    candidate.push("");
    candidate.push("Resume (extracted text):");
    candidate.push(resumeText.slice(0, RESUME_CHAR_LIMIT));
  }

  lines.push("");
  lines.push("# CANDIDATE");
  lines.push(wrapUntrusted(candidate.join("\n")));

  return lines.join("\n");
}

async function requestMatch(userPrompt: string): Promise<unknown> {
  const client = getAnthropicClient();
  const response = await client.messages.create({
    model: QUESTION_MODEL,
    max_tokens: 2000,
    system: [
      { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
    ],
    tools: [MATCH_TOOL],
    tool_choice: { type: "tool", name: "submit_match" },
    messages: [{ role: "user", content: userPrompt }],
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Model did not return a tool_use block.");
  }
  return toolUse.input;
}

function tidyGapLabel(label: string): string {
  const trimmed = label.trim().replace(/[.!]+$/, "");
  const lowered = trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
  return lowered.length > GAP_LABEL_MAX_CHARS
    ? `${lowered.slice(0, GAP_LABEL_MAX_CHARS - 1).trimEnd()}…`
    : lowered;
}

const STATUS_CREDIT: Record<MatchRequirement["status"], number> = {
  met: 1,
  partial: 0.5,
  unmet: 0,
};

export function scoreMatch(requirements: MatchRequirement[]): {
  percent: number;
  unmetQualifiers: string[];
} {
  const credit = requirements.reduce(
    (sum, r) => sum + STATUS_CREDIT[r.status],
    0
  );
  const percent = Math.round((credit / requirements.length) * 100);

  // Unmet gaps first, then partial ones, deduplicated.
  const unmetQualifiers: string[] = [];
  for (const status of ["unmet", "partial"] as const) {
    for (const r of requirements) {
      if (r.status !== status) continue;
      const label = tidyGapLabel(r.gapLabel || r.requirement);
      if (label && !unmetQualifiers.includes(label)) unmetQualifiers.push(label);
    }
  }
  return {
    percent,
    unmetQualifiers: unmetQualifiers.slice(0, MAX_UNMET_QUALIFIERS),
  };
}

export type ComputeMatchOutcome =
  | "computed"
  | "skipped_existing"
  | "skipped_no_resume"
  | "skipped_no_job";

// Computes and stores the match for one application. Skips when it was already
// computed or the candidate has no resume text. Throws on a hard failure; the
// caller logs it and the columns stay null.
export async function computeApplicationMatch(
  applicationId: string
): Promise<ComputeMatchOutcome> {
  const application = await loadApplication(applicationId);
  if (!application) throw new Error(`Application ${applicationId} not found.`);
  if (application.matchedAt != null) return "skipped_existing";
  // Pre-screens have no job to match against.
  if (!application.job) return "skipped_no_job";
  if (!hasResumeText(application)) return "skipped_no_resume";

  const userPrompt = buildUserPrompt({ ...application, job: application.job });

  let parsed: z.infer<typeof outputSchema> | null = null;
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      parsed = outputSchema.parse(await requestMatch(userPrompt));
      break;
    } catch (error) {
      lastError = error;
    }
  }
  if (!parsed) {
    throw new Error(
      `Match computation failed after retry: ${
        lastError instanceof Error ? lastError.message : String(lastError)
      }`
    );
  }

  const requirements: MatchRequirement[] = parsed.requirements.map((r) => ({
    requirement: r.requirement,
    kind: r.kind,
    status: r.status,
    gapLabel: r.status === "met" ? null : r.gapLabel || null,
  }));
  const { percent, unmetQualifiers } = scoreMatch(requirements);
  const matchJson: MatchJson = { requirements, unmetQualifiers };

  await prisma.application.update({
    where: { id: applicationId },
    data: { matchPercent: percent, matchJson, matchedAt: new Date() },
  });
  return "computed";
}
