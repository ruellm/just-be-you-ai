import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAnthropicClient, QUESTION_MODEL } from "@/lib/ai/anthropic";
import { untrustedNotice, wrapUntrusted } from "@/lib/ai/interview-prompts";
import { resolveApplicationResume } from "@/lib/ai/resume-snapshot";
import { resolveInterviewJob } from "@/lib/prescreen";

const RESUME_CHAR_LIMIT = 8000;

// ── Output schema (Zod validates the model's tool input; retry once on failure)
const questionSchema = z.object({
  order: z.number().int(),
  category: z.enum(["core", "personalized", "behavioral"]),
  text: z.string().trim().min(1),
  rationale: z.string().trim().min(1),
});
const outputSchema = z.object({
  questions: z.array(questionSchema).length(6),
});

// JSON Schema for the forced tool. (Array-length can't be expressed here, so we
// enforce "exactly 6" in Zod above.)
const QUESTIONS_TOOL: Anthropic.Tool = {
  name: "submit_questions",
  description: "Submit the six generated interview questions, in order.",
  input_schema: {
    type: "object",
    properties: {
      questions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            order: { type: "integer", description: "1–6, matching the required sequence" },
            category: {
              type: "string",
              enum: ["core", "personalized", "behavioral"],
            },
            text: { type: "string", description: "The question to ask aloud" },
            rationale: {
              type: "string",
              description: "One sentence on why this question fits this candidate + role",
            },
          },
          required: ["order", "category", "text", "rationale"],
          additionalProperties: false,
        },
      },
    },
    required: ["questions"],
    additionalProperties: false,
  } as Anthropic.Tool["input_schema"],
};

// Static across all applications → safe to cache (see note in CLAUDE.md).
const SYSTEM_PROMPT = `You are an expert interviewer preparing a short, on-demand voice interview for one candidate applying to one specific job.

Generate exactly 6 questions, in this category sequence:
1: core, 2: personalized, 3: behavioral, 4: core, 5: personalized, 6: behavioral.

- "core" questions assess fit for the role. Anchor them on the job's Interview hints and Ideal candidate profile when those are provided; if both are empty, anchor them on the job description and required skills.
- "personalized" questions draw on THIS candidate's resume, skills, or work experience — reference concrete details from their profile.
- "behavioral" questions are situational (e.g. "Tell me about a time…", "How would you approach…").

For each question, also write a one-sentence "rationale" explaining why it is relevant to this candidate and role. The rationale is for internal review only; the candidate never sees it.

Rules:
- Questions must be conversational and natural to ask aloud in a voice interview. One topic per question. Avoid yes/no questions. Keep each question under 35 words.
- Set "order" to 1–6 matching the sequence above, and "category" to the matching value.
- Base personalized questions only on details actually present in the candidate's profile or resume — never invent facts.
- Call the submit_questions tool with all six questions. Do not write anything else.

${untrustedNotice("generator")}`;

type ApplicationForGeneration = NonNullable<
  Awaited<ReturnType<typeof loadApplication>>
>;

function loadApplication(applicationId: string) {
  return prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      job: { include: { skills: { include: { skill: true } } } },
      candidateProfile: {
        include: {
          skills: { include: { skill: true } },
          workExperiences: { orderBy: { startDate: "desc" } },
        },
      },
    },
  });
}

function buildUserPrompt(application: ApplicationForGeneration): string {
  // A pre-screen has no job row; the stand-in comes from the candidate's own
  // profile (see lib/prescreen.ts).
  const job = resolveInterviewJob(application);
  const cp = application.candidateProfile;
  const skillNames = job.skillNames;
  const lines: string[] = [];

  lines.push("# JOB");
  lines.push(`Title: ${job.title}`);
  lines.push(`Level: ${job.level}`);
  if (job.description) lines.push(`Description: ${job.description}`);
  if (job.roleOverview) lines.push(`Role overview: ${job.roleOverview}`);
  if (job.requirements) lines.push(`Requirements: ${job.requirements}`);
  if (job.dayToDay) lines.push(`Day-to-day: ${job.dayToDay}`);
  lines.push(`Required skills: ${skillNames.length ? skillNames.join(", ") : "(none listed)"}`);
  lines.push(`Interview hints: ${job.interviewHints?.trim() || "(none provided)"}`);
  lines.push(
    `Ideal candidate profile: ${job.idealCandidateProfile?.trim() || "(none provided)"}`
  );
  lines.push(`Passing criteria: ${job.passingCriteria?.trim() || "(none provided)"}`);

  // Everything the candidate typed or uploaded goes inside untrusted-data tags.
  const candidate: string[] = [];
  const name = [cp.firstName, cp.lastName].filter(Boolean).join(" ");
  candidate.push(`Name: ${name || "(not provided)"}`);
  if (cp.preferredRole) candidate.push(`Preferred role: ${cp.preferredRole}`);
  if (cp.totalYearsExperience != null)
    candidate.push(`Total years of experience: ${cp.totalYearsExperience}`);
  if (cp.summary) candidate.push(`Summary: ${cp.summary}`);

  const candidateSkills = cp.skills.map(
    (s) => `${s.skill.name} (${s.yearsOfExperience}y)`
  );
  candidate.push(`Skills: ${candidateSkills.length ? candidateSkills.join(", ") : "(none)"}`);

  if (cp.workExperiences.length) {
    candidate.push("Work experience:");
    for (const w of cp.workExperiences) {
      const desc = w.description ? ` — ${w.description}` : "";
      candidate.push(`- ${w.position} at ${w.companyName} (${w.employmentType})${desc}`);
    }
  }

  lines.push("");
  lines.push("# CANDIDATE");
  lines.push(wrapUntrusted(candidate.join("\n")));

  // The resume as it stood at apply time, not the live profile (pre-snapshot
  // applications fall back to the profile inside resolveApplicationResume).
  // Still the RAW parsed text, as before.
  const resumeText = resolveApplicationResume(application).parsedText;
  if (resumeText) {
    lines.push("");
    lines.push("# CANDIDATE RESUME (extracted text)");
    lines.push(wrapUntrusted(resumeText.slice(0, RESUME_CHAR_LIMIT)));
  }

  return lines.join("\n");
}

async function requestQuestions(userPrompt: string): Promise<unknown> {
  const client = getAnthropicClient();
  const response = await client.messages.create({
    model: QUESTION_MODEL,
    max_tokens: 4000,
    system: [
      { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
    ],
    tools: [QUESTIONS_TOOL],
    tool_choice: { type: "tool", name: "submit_questions" },
    messages: [{ role: "user", content: userPrompt }],
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Model did not return a tool_use block.");
  }
  return toolUse.input;
}

// Generates 6 interview questions for an application and stores them. Throws on
// a hard failure (the caller decides whether to surface it).
//
// Idempotency: by default this NO-OPs when questions already exist for the
// application — Apply fires it as a detached background task, so a double-fire
// must not burn a second Claude call. Pass `overwrite: true` (admin Regenerate)
// to delete + recreate instead.
export async function generateQuestionsForApplication(
  applicationId: string,
  { overwrite = false }: { overwrite?: boolean } = {}
): Promise<void> {
  if (!overwrite) {
    const existing = await prisma.generatedQuestion.count({
      where: { applicationId },
    });
    if (existing > 0) return;
  }

  const application = await loadApplication(applicationId);
  if (!application) {
    throw new Error(`Application ${applicationId} not found.`);
  }

  const userPrompt = buildUserPrompt(application);

  let parsed: z.infer<typeof outputSchema> | null = null;
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const input = await requestQuestions(userPrompt);
      parsed = outputSchema.parse(input);
      break;
    } catch (error) {
      lastError = error;
    }
  }
  if (!parsed) {
    throw new Error(
      `Question generation failed after retry: ${
        lastError instanceof Error ? lastError.message : String(lastError)
      }`
    );
  }

  const ordered = [...parsed.questions].sort((a, b) => a.order - b.order);

  await prisma.$transaction([
    prisma.generatedQuestion.deleteMany({ where: { applicationId } }),
    prisma.generatedQuestion.createMany({
      data: ordered.map((q, index) => ({
        applicationId,
        order: index + 1,
        category: q.category,
        text: q.text,
        rationale: q.rationale,
      })),
    }),
  ]);
}
