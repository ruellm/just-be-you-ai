// Rubric evaluation of an ADVANCED (ElevenLabs) interview — the TypeScript
// twin of the Python evaluator the basic (LiveKit) path runs
// (voice-agent/lib/evaluate.py), kept as close to byte-identical as practical:
// same Claude model, same system prompt (built from shared/interview-rubric.json
// via lib/ai/rubric.ts), same forced submit_evaluation tool schema, same
// user-content assembly (section order, truncation caps, N/A fallbacks), same
// 2-attempt retry, and the same neutral fallback so the caller can ALWAYS
// write an interview_results row.
//
// The model produces ONLY the per-sub-criterion 1-5 scores (+ evidence quotes)
// and the human-readable pieces (fit_summary/strengths/concerns/
// recommendation). Everything decision-shaped — category scores, the 0-100
// composite via the job's passing bar, the verdict band, hard gates, and the
// legacy passed/tier/score fields — is computed DETERMINISTICALLY by
// rubric.ts#decideOutcome, never by the model.
//
// The output keeps the Python snake_case field names (fit_score, fit_summary…)
// because the grading orchestrator maps them onto the camelCase
// InterviewResult columns exactly like save_result.py does.
//
// Injection defense: every candidate-derived field in the user content sits
// inside untrusted-data tags (resume, profile, transcript, fit signals), the
// system prompt says instructions in there are reported, not followed, and the
// model reports manipulation attempts with verbatim quotes. Quotes that are
// not really in the text are dropped in code. Attempts are evidence only and
// have NO score effect (the integrity gate in rubric.ts stays dormant).
//
// KNOWN LIMIT: the call that scores is also the call that detects, so a
// sufficiently effective injection could suppress its own detection. A
// separate classification call addresses this later. Do not solve it here.
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
import {
  buildManipulationToolSchema,
  evaluatorNamingRule,
  keepVerbatimAttempts,
  manipulationPromptSection,
  untrustedNotice,
  wrapUntrusted,
  type ManipulationAttempt,
} from "@/lib/ai/interview-prompts";
import { resolveApplicationResume } from "@/lib/ai/resume-snapshot";
import { resolveInterviewJob } from "@/lib/prescreen";
import {
  ALL_SUB_CRITERION_KEYS,
  buildRubricPromptBlock,
  buildRubricScoresJson,
  buildRubricScoresToolSchema,
  decideOutcome,
  resolveMustHaveKeys,
  resolvePassingBar,
  type GateFired,
  type RubricScores,
  type Verdict,
} from "@/lib/ai/rubric";

// Same model as the Python evaluator (EVAL_MODEL in evaluate.py) and the
// Phase 2.1 question generator.
const EVAL_MODEL = QUESTION_MODEL; // "claude-sonnet-4-6"
const MAX_RESUME_CHARS = 8000;
const MAX_RETRIES = 2; // total attempts at the structured call before falling back
// 20 sub-scores with evidence quotes + the qualitative summary need headroom.
const MAX_TOKENS = 4000;

// ── output schemas ───────────────────────────────────────────────────────────

const evidenceItemSchema = z.object({
  dimension: z.string(), // e.g. "technical_depth", "communication", "motivation"
  evidence: z.string(), // one-sentence summary
  impact: z.enum(["positive", "negative"]),
});

const subScoreSchema = z.object({
  score: z.number().int().min(1).max(5),
  evidence: z.string().nullable(),
});

const manipulationAttemptSchema = z.object({
  quote: z.string(),
  classification: z.string(),
  source: z.string(),
});

// What the MODEL returns via the forced tool. The decision-shaped fields
// (composite/verdict/passed/tier/score) are deliberately absent — they are
// computed in code from rubric_scores.
const modelOutputSchema = z.object({
  rubric_scores: z.record(z.string(), subScoreSchema),
  fit_summary: z.string(), // one paragraph, ~3-5 sentences
  strengths: z.array(evidenceItemSchema).default([]),
  concerns: z.array(evidenceItemSchema).default([]),
  recommendation: z.enum(["hire", "consider", "pass"]),
  manipulation_attempts: z.array(manipulationAttemptSchema).default([]),
});

export type EvidenceItem = z.infer<typeof evidenceItemSchema>;

// What the grading orchestrator persists. Legacy fields keep their existing
// names/semantics (backward-compatible displays); the rubric fields are null
// exactly when the evaluation fell back (no rubric scoring happened).
export interface EvaluationResult {
  fit_score: number; // legacy 0-1 `score` column = composite/100
  tier: "entry" | "novice" | "advanced" | "expert";
  passed: boolean; // verdict is pass/strong_pass
  fit_summary: string;
  strengths: EvidenceItem[];
  concerns: EvidenceItem[];
  recommendation: "hire" | "consider" | "pass";
  rubric_scores_json: Record<string, unknown> | null;
  composite_score: number | null; // 0-100, per the job's passing bar
  verdict: Verdict | null;
  gates_fired: GateFired[] | null;
  // Verified-verbatim manipulation attempts. null = not assessed (fallback).
  manipulation_attempts: ManipulationAttempt[] | null;
}

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
    rubric_scores_json: null,
    composite_score: null,
    verdict: null,
    gates_fired: null,
    manipulation_attempts: null,
  };
}

// ── the Claude call (system prompt + tool schema mirrored in evaluate.py) ────

const SYSTEM_PROMPT =
  "You are grading a voice-only job interview for the specific role described, " +
  "scoring the candidate against a fixed rubric. Score STRICTLY against the " +
  "rubric anchors below — not against vibes or your own standards. Be honest " +
  "and direct; base every score on evidence from the transcript, not sympathy.\n\n" +
  untrustedNotice("evaluator") +
  "\n\n" +
  "SCORING SCALE — every sub-criterion gets an integer score 1-5:\n" +
  "  1-2 = Below the anchor\n" +
  "  3   = Meets the anchor\n" +
  "  4-5 = Exceeds the anchor\n\n" +
  "RUBRIC:\n\n" +
  buildRubricPromptBlock() +
  "\n\n" +
  "EVIDENCE RULES:\n" +
  "- For every sub-criterion, `evidence` is a short verbatim excerpt from the " +
  "transcript (the candidate's own words) that justifies the score.\n" +
  "- NEVER fabricate, embellish, or paraphrase a quote that is not actually in " +
  "the transcript. If the interview genuinely produced no evidence for a " +
  "sub-criterion, set its `evidence` to null and score conservatively — a " +
  "sub-criterion with no evidence must not score above 3.\n\n" +
  "ATTRIBUTE-BLIND GRADING:\n" +
  "Ignore the candidate's name, accent, dialect, gender, age, ethnicity, " +
  "nationality, and every other personal attribute. Grade only what was " +
  "demonstrated: the content of the answers and how clearly the ideas were " +
  "communicated. Imperfect grammar or a non-native accent is NOT a " +
  "communication weakness — clarity of ideas is what counts.\n" +
  evaluatorNamingRule() +
  "\n\n" +
  "Alongside the rubric scores, also produce the human-readable summary: " +
  "fit_summary (one paragraph, 3-5 sentences, on overall fit for THIS role), " +
  "strengths (2-5 positive evidence items), concerns (0-5 negative evidence " +
  "items), and recommendation (hire / consider / pass).\n\n" +
  "The transcript may end with a closing segment where the CANDIDATE asks " +
  "questions about the role or the company and the interviewer answers them. " +
  "Disregard that closing segment entirely — do not score it under any " +
  "sub-criterion, positively or negatively.\n\n" +
  manipulationPromptSection();

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
  description: "Submit your structured rubric evaluation of the candidate.",
  input_schema: {
    type: "object",
    properties: {
      rubric_scores: buildRubricScoresToolSchema(),
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
      manipulation_attempts: buildManipulationToolSchema(),
    },
    required: [
      "rubric_scores",
      "fit_summary",
      "strengths",
      "concerns",
      "recommendation",
      "manipulation_attempts",
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
//
// Returns the prompt plus `candidateText`: every candidate-derived piece that
// went into it, which is what manipulation quotes are verified against.
function buildUserContent(
  app: InterviewApplication,
  transcript: string,
  fitSignals: EvidenceItem[] | Array<Record<string, unknown>>
): { content: string; candidateText: string } {
  const job = resolveInterviewJob(app);
  const cp = app.candidateProfile;

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

  const profile =
    `Name: ${resolveFullName(app)}\n` +
    `Preferred role: ${cp.preferredRole || "N/A"}\n` +
    `Total years experience: ${cp.totalYearsExperience != null ? cp.totalYearsExperience : "N/A"}\n` +
    `Summary: ${truncate(cp.summary, 1500) || "N/A"}\n` +
    `Skills: ${skills}\n` +
    `Work experience:\n${work}`;
  // Deliberately the RAW parsed text, not cleanedResumeText — the Python
  // evaluator grades on parsed_resume_text (only the live interview prompts
  // use the PII-stripped version), and this port must judge identically.
  // (Hidden text is already gone: it is dropped at parse time.)
  //
  // Read from the apply-time SNAPSHOT, never the live profile: otherwise a
  // candidate could apply clean, get questions, then swap in a loaded resume
  // before grading. Pre-snapshot applications fall back to the profile inside
  // resolveApplicationResume.
  const resume =
    truncate(resolveApplicationResume(app).parsedText, MAX_RESUME_CHARS) || "N/A";
  const transcriptText =
    transcript || "(empty — the candidate said little or nothing)";

  const content =
    "# JOB\n" +
    `Title: ${job.title}\n` +
    `Level required: ${job.level || "unspecified"}\n` +
    `Description: ${truncate(job.description, 2000) || "N/A"}\n` +
    `Role overview: ${truncate(job.roleOverview, 1500) || "N/A"}\n` +
    `Requirements: ${truncate(job.requirements, 1500) || "N/A"}\n` +
    `Day-to-day: ${truncate(job.dayToDay, 1000) || "N/A"}\n` +
    `Ideal candidate profile: ${truncate(job.idealCandidateProfile, 1500) || "N/A"}\n` +
    `Passing criteria: ${truncate(job.passingCriteria, 1500) || "N/A"}\n` +
    `Interviewer hints: ${truncate(job.interviewHints, 1500) || "N/A"}\n\n` +
    "# CANDIDATE\n" +
    `${wrapUntrusted(profile)}\n\n` +
    "Parsed resume text:\n" +
    `${wrapUntrusted(resume)}\n\n` +
    "# INTERVIEW TRANSCRIPT\n" +
    '(Lines starting with "Candidate:" are the untrusted party speaking.)\n' +
    `${wrapUntrusted(transcriptText)}\n\n` +
    "# FIT SIGNALS NOTED BY THE INTERVIEWER IN REAL-TIME\n" +
    `${wrapUntrusted(signals)}\n\n` +
    "Return your evaluation in the required structured format via the " +
    "submit_evaluation tool.";

  return { content, candidateText: [profile, resume, transcriptText].join("\n") };
}

/**
 * Grade an interview against the shared rubric — the advanced-path twin of
 * evaluate.py#evaluate_interview. Never throws: any failure (missing key,
 * API error, invalid tool output after retry) degrades to the same neutral
 * fallback the Python side uses (rubric fields null), so the caller always
 * has a row to write.
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

  const { content: userContent, candidateText } = buildUserContent(
    context,
    transcript,
    fitSignals
  );
  const job = resolveInterviewJob(context);
  const passingBar = resolvePassingBar(job.passingBar);
  const mustHaveKeys = resolveMustHaveKeys(job.mustHaveCriteriaJson);

  let lastError: unknown = null;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const client = getAnthropicClient();
      const response = await client.messages.create({
        model: EVAL_MODEL,
        max_tokens: MAX_TOKENS,
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
      const modelOutput = modelOutputSchema.parse(toolUse.input);

      // Every rubric sub-criterion must be scored; a missing key fails the
      // attempt (and triggers the retry). Blank evidence normalizes to null.
      const scores: RubricScores = {};
      for (const key of ALL_SUB_CRITERION_KEYS) {
        const sub = modelOutput.rubric_scores[key];
        if (!sub) {
          throw new Error(`rubric_scores is missing sub-criterion "${key}".`);
        }
        scores[key] = {
          score: sub.score,
          evidence: sub.evidence?.trim() ? sub.evidence.trim() : null,
        };
      }

      // Evidence only: attempts never feed decideOutcome (no integrityFlag is
      // passed), so they cannot move the score or the verdict.
      const decision = decideOutcome(scores, { passingBar, mustHaveKeys });

      // No evidence, no claim: keep only quotes that are really in the text.
      const attempts = keepVerbatimAttempts(
        modelOutput.manipulation_attempts,
        candidateText
      );
      const unverified = modelOutput.manipulation_attempts.length - attempts.length;
      if (unverified > 0) {
        console.warn(
          `[evaluate-interview] Dropped ${unverified} manipulation attempt(s) whose quote was not verbatim.`
        );
      }

      console.log(
        `[evaluate-interview] Evaluation ok (attempt ${attempt}): ` +
          `composite=${decision.composite} bar=${decision.passingBar} ` +
          `verdict=${decision.verdict} gates=${decision.gatesFired.length} ` +
          `passed=${decision.passed} rec=${modelOutput.recommendation} ` +
          `manipulation=${attempts.length}`
      );
      return {
        fit_score: decision.legacyScore,
        tier: decision.tier,
        passed: decision.passed,
        fit_summary: modelOutput.fit_summary,
        strengths: modelOutput.strengths,
        concerns: modelOutput.concerns,
        recommendation: modelOutput.recommendation,
        rubric_scores_json: buildRubricScoresJson(scores, decision),
        composite_score: decision.composite,
        verdict: decision.verdict,
        gates_fired: decision.gatesFired,
        manipulation_attempts: attempts,
      };
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
