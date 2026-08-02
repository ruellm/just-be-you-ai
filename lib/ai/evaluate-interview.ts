// Phase 3.4 — real fit evaluation of an ADVANCED (ElevenLabs) interview.
//
// This is a faithful TypeScript port of the Python evaluation the basic
// (LiveKit) path runs — voice-agent/lib/evaluate.py — kept as close to
// byte-identical as practical: same Claude model, same system prompt, same
// forced submit_evaluation tool schema, same user-content assembly (section
// order, truncation caps, N/A fallbacks), same 2-attempt retry, and the same
// neutral fallback so the caller can ALWAYS write an interview_results row.
//
// The output keeps the Python snake_case field names (fit_score, fit_summary…)
// because those ARE the tool-input keys Claude returns; the grading
// orchestrator maps them onto the camelCase InterviewResult columns exactly
// like save_result.py does.
//
// If voice-agent/lib/evaluate.py changes, mirror it here.
//
// NOTE: no `import "server-only"` — same reasoning as load-interview-context.ts
// (keeps the module loadable from plain-tsx debug scripts). It still only ever
// runs server-side (it reads ANTHROPIC_API_KEY).

import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { getAnthropicClient, QUESTION_MODEL } from "@/lib/ai/anthropic";
import type { InterviewApplication } from "@/lib/ai/load-interview-context";

// Same model as the Python evaluator (EVAL_MODEL in evaluate.py) and the
// Phase 2.1 question generator.
const EVAL_MODEL = QUESTION_MODEL; // "claude-sonnet-4-6"
const MAX_RESUME_CHARS = 8000;
const MAX_RETRIES = 2; // total attempts at the structured call before falling back

// ── output schema (mirrors evaluate.py's Pydantic models) ────────────────────

const evidenceItemSchema = z.object({
  dimension: z.string(), // e.g. "technical_depth", "communication", "motivation"
  evidence: z.string(), // one-sentence summary
  impact: z.enum(["positive", "negative"]),
});

const evaluationResultSchema = z.object({
  fit_score: z.number().min(0).max(1),
  tier: z.enum(["entry", "novice", "advanced", "expert"]),
  passed: z.boolean(),
  fit_summary: z.string(), // one paragraph, ~3-5 sentences
  strengths: z.array(evidenceItemSchema).default([]),
  concerns: z.array(evidenceItemSchema).default([]),
  recommendation: z.enum(["hire", "consider", "pass"]),
});

export type EvidenceItem = z.infer<typeof evidenceItemSchema>;
export type EvaluationResult = z.infer<typeof evaluationResultSchema>;

/** Neutral result used when the Claude call fails (mirrors fallback_evaluation). */
export function fallbackEvaluation(): EvaluationResult {
  return {
    fit_score: 0.5,
    tier: "novice",
    passed: false,
    fit_summary: "Evaluation failed — please review the transcript manually.",
    strengths: [],
    concerns: [],
    recommendation: "consider",
  };
}

// ── the Claude call (system prompt + tool schema verbatim from evaluate.py) ──

const SYSTEM_PROMPT =
  "You are grading a job interview to determine candidate FIT for the specific " +
  "role described. Your job is NOT to grade quiz answers. Judge whether this " +
  "candidate would be effective in this specific job based on everything you " +
  "know: their resume, their profile, the job requirements, the ideal candidate " +
  "profile, the passing criteria, the interview transcript, and the fit signals " +
  "the interviewer noted in real-time. Be honest and direct. If the candidate is " +
  "a poor fit, say so clearly. If they're strong, say so clearly. Base your " +
  "judgment on evidence, not sympathy.\n\n" +
  "Tier maps to overall fit level:\n" +
  "  - entry: minimal fit / clearly not ready\n" +
  "  - novice: some fit signals but significant gaps\n" +
  "  - advanced: strong fit with minor concerns\n" +
  "  - expert: exceptional fit across all dimensions\n" +
  "Decide the tier from the overall evidence — do not compute it mechanically " +
  "from the score. Set `passed` to true ONLY if you would recommend advancing " +
  "this candidate to the next round of a real hiring process.\n\n" +
  // Advanced-path addition (not yet in evaluate.py): the transcript now ends
  // with a closing candidate-questions segment that must not affect grading.
  "The transcript may end with a closing segment where the CANDIDATE asks " +
  "questions about the role or the company and the interviewer answers them. " +
  "Base your fit judgment ONLY on the interview/assessment portion of the " +
  "conversation and disregard that closing candidate-questions segment " +
  "entirely. Whether the candidate asks questions — and what they ask — must " +
  "not be scored as a positive or negative fit signal. It is not part of the " +
  "assessment.";

const EVIDENCE_ITEM_SCHEMA = {
  type: "object",
  properties: {
    dimension: {
      type: "string",
      description:
        "Short fit dimension, e.g. 'technical_depth', " +
        "'communication', 'motivation', 'problem_solving', 'domain_experience'.",
    },
    evidence: {
      type: "string",
      description: "One-sentence summary of the supporting evidence.",
    },
    impact: { type: "string", enum: ["positive", "negative"] },
  },
  required: ["dimension", "evidence", "impact"],
};

const EVAL_TOOL: Anthropic.Tool = {
  name: "submit_evaluation",
  description: "Submit your structured fit evaluation of the candidate.",
  input_schema: {
    type: "object",
    properties: {
      fit_score: {
        type: "number",
        description: "Overall fit, 0.0 (no fit) to 1.0 (perfect fit).",
      },
      tier: {
        type: "string",
        enum: ["entry", "novice", "advanced", "expert"],
      },
      passed: {
        type: "boolean",
        description: "True only if you'd advance them to the next round.",
      },
      fit_summary: {
        type: "string",
        description: "One paragraph (3-5 sentences) on overall fit.",
      },
      strengths: {
        type: "array",
        items: EVIDENCE_ITEM_SCHEMA,
        description: "2-5 positive-impact evidence items.",
      },
      concerns: {
        type: "array",
        items: EVIDENCE_ITEM_SCHEMA,
        description: "0-5 negative-impact evidence items.",
      },
      recommendation: {
        type: "string",
        enum: ["hire", "consider", "pass"],
      },
    },
    required: [
      "fit_score",
      "tier",
      "passed",
      "fit_summary",
      "strengths",
      "concerns",
      "recommendation",
    ],
  } as Anthropic.Tool["input_schema"],
};

// Mirrors evaluate.py#_truncate: strip, hard-cap, "…[truncated]" marker.
function truncate(text: string | null | undefined, limit: number): string {
  if (!text) return "";
  const trimmed = text.trim();
  return trimmed.length <= limit ? trimmed : trimmed.slice(0, limit) + "…[truncated]";
}

// Mirrors load_context.py's full_name: firstName/lastName → user email → "Candidate".
function resolveFullName(app: InterviewApplication): string {
  const cp = app.candidateProfile;
  const name = [cp.firstName?.trim(), cp.lastName?.trim()]
    .filter(Boolean)
    .join(" ")
    .trim();
  return name || cp.user.email || "Candidate";
}

// Mirrors evaluate.py#_build_user_content. `fitSignals` stays a parameter for
// shape-parity with Python, but the advanced path has no note_fit_signal tool,
// so callers pass [] and the prompt renders the same "None noted" line the
// Python side renders for a signal-less interview.
function buildUserContent(
  app: InterviewApplication,
  transcript: string,
  fitSignals: EvidenceItem[] | Array<Record<string, unknown>>
): string {
  const { job, candidateProfile: cp } = app;

  const skills =
    cp.skills
      .map(
        (s) =>
          s.skill.name + (s.yearsOfExperience ? ` (${s.yearsOfExperience}y)` : "")
      )
      .join(", ") || "None listed";

  let work: string;
  if (cp.workExperiences.length) {
    const workLines: string[] = [];
    for (const w of cp.workExperiences) {
      // Python renders the raw PostgREST end-date string; here we have a Date,
      // rendered date-only (YYYY-MM-DD) — same information.
      const span = w.currentlyWorking
        ? "current"
        : (w.endDate?.toISOString().slice(0, 10) ?? "");
      let header = `- ${w.position} at ${w.companyName}`;
      if (span) header += ` (${span})`;
      workLines.push(header);
      if (w.description) workLines.push(`    ${w.description.trim()}`);
    }
    work = workLines.join("\n");
  } else {
    work = "None listed";
  }

  let signals: string;
  if (fitSignals.length) {
    signals = fitSignals
      .map((s: Record<string, unknown>) => {
        return `- [${s.strength ?? "?"}] ${s.dimension ?? "?"}: ${s.evidence ?? ""}`;
      })
      .join("\n");
  } else {
    signals = "None noted during the interview.";
  }

  return (
    "# JOB\n" +
    `Title: ${job.title}\n` +
    `Company: ${job.company.name}\n` +
    `Level required: ${job.level || "unspecified"}\n` +
    `Description: ${truncate(job.description, 2000) || "N/A"}\n` +
    `Role overview: ${truncate(job.roleOverview, 1500) || "N/A"}\n` +
    `Requirements: ${truncate(job.requirements, 1500) || "N/A"}\n` +
    `Day-to-day: ${truncate(job.dayToDay, 1000) || "N/A"}\n` +
    `Ideal candidate profile: ${truncate(job.idealCandidateProfile, 1500) || "N/A"}\n` +
    `Passing criteria: ${truncate(job.passingCriteria, 1500) || "N/A"}\n` +
    `Interviewer hints: ${truncate(job.interviewHints, 1500) || "N/A"}\n\n` +
    "# CANDIDATE\n" +
    `Name: ${resolveFullName(app)}\n` +
    `Preferred role: ${cp.preferredRole || "N/A"}\n` +
    `Total years experience: ${cp.totalYearsExperience != null ? cp.totalYearsExperience : "N/A"}\n` +
    `Summary: ${truncate(cp.summary, 1500) || "N/A"}\n` +
    `Skills: ${skills}\n` +
    `Work experience:\n${work}\n\n` +
    // Deliberately the RAW parsed text, not cleanedResumeText — the Python
    // evaluator grades on parsed_resume_text (only the live interview prompts
    // use the PII-stripped version), and this port must judge identically.
    `Parsed resume text:\n${truncate(cp.parsedResumeText, MAX_RESUME_CHARS) || "N/A"}\n\n` +
    "# INTERVIEW TRANSCRIPT\n" +
    `${transcript || "(empty — the candidate said little or nothing)"}\n\n` +
    "# FIT SIGNALS NOTED BY THE INTERVIEWER IN REAL-TIME\n" +
    `${signals}\n\n` +
    "Return your evaluation in the required structured format via the " +
    "submit_evaluation tool."
  );
}

/**
 * Grade an interview with Claude — the advanced-path twin of
 * evaluate.py#evaluate_interview. Never throws: any failure (missing key,
 * API error, invalid tool output after retry) degrades to the same neutral
 * fallback the Python side uses, so the caller always has a row to write.
 *
 * `transcript` must be in the stored `AI:`/`Candidate:` line format (see
 * lib/elevenlabs/fetch-transcript.ts).
 */
export async function evaluateInterview(
  context: InterviewApplication,
  transcript: string,
  fitSignals: EvidenceItem[] = []
): Promise<EvaluationResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("[evaluate-interview] ANTHROPIC_API_KEY not set; using fallback evaluation.");
    return fallbackEvaluation();
  }

  const userContent = buildUserContent(context, transcript, fitSignals);

  let lastError: unknown = null;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const client = getAnthropicClient();
      const response = await client.messages.create({
        model: EVAL_MODEL,
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        tools: [EVAL_TOOL],
        tool_choice: { type: "tool", name: "submit_evaluation" },
        messages: [{ role: "user", content: userContent }],
      });

      const toolUse = response.content.find(
        (block) => block.type === "tool_use" && block.name === "submit_evaluation"
      );
      if (!toolUse || toolUse.type !== "tool_use") {
        throw new Error("No submit_evaluation tool_use block in response.");
      }
      const result = evaluationResultSchema.parse(toolUse.input);
      console.log(
        `[evaluate-interview] Evaluation ok (attempt ${attempt}): ` +
          `tier=${result.tier} score=${result.fit_score.toFixed(2)} ` +
          `passed=${result.passed} rec=${result.recommendation}`
      );
      return result;
    } catch (error) {
      lastError = error;
      console.warn(`[evaluate-interview] Evaluation attempt ${attempt} failed:`, error);
    }
  }

  console.error(
    `[evaluate-interview] Evaluation failed after ${MAX_RETRIES} attempts; using fallback.`,
    lastError
  );
  return fallbackEvaluation();
}
