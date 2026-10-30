// Typed access to shared/interview-prompts.json: the interviewer's conversation
// rules (both voice tiers) and the untrusted-data framing used wherever
// candidate-derived content enters a prompt.
//
// MIRROR: voice-agent/lib/prompts.py is the logical twin of this module (same
// rendering, same wrapping, same name check). If you change one, change the
// other. The prompt text itself lives ONLY in the shared JSON.

import promptsJson from "@/shared/interview-prompts.json";

export type VoiceTier = "basic" | "advanced";
export type UntrustedRole =
  | "agent"
  | "evaluator"
  | "generator"
  | "cleaner"
  | "matcher";

type Line = string | { tiers?: string[]; text: string };
interface Block {
  tiers?: string[];
  lines: Line[];
}

const UNTRUSTED = promptsJson.untrustedData;
const AGENT = promptsJson.agent as {
  tierVars: Record<VoiceTier, Record<string, string>>;
  blocks: Block[];
};

// A first name is spoken aloud and sits outside the untrusted-data tags, so
// only something that looks like a name is accepted.
const FIRST_NAME_MAX_CHARS = 40;
const FIRST_NAME_PATTERN = /^[\p{L}\p{M}'’.-]+$/u;

export function isPlausibleFirstName(name: string): boolean {
  return name.length <= FIRST_NAME_MAX_CHARS && FIRST_NAME_PATTERN.test(name);
}

/** The interviewer's conversation rules for one tier, {company} filled in. */
export function renderAgentRules(tier: VoiceTier, company: string): string {
  const vars: Record<string, string> = { ...AGENT.tierVars[tier], company };
  const applies = (tiers?: string[]) => !tiers || tiers.includes(tier);
  return AGENT.blocks
    .filter((block) => applies(block.tiers))
    .map((block) =>
      block.lines
        .filter((line) => typeof line === "string" || applies(line.tiers))
        .map((line) => (typeof line === "string" ? line : line.text))
        .join("\n")
    )
    .join("\n\n")
    .replace(/\{(\w+)\}/g, (match, key: string) => vars[key] ?? match);
}

/** The untrusted-data paragraph for a prompt, with the role's handling rule. */
export function untrustedNotice(role: UntrustedRole): string {
  return `${UNTRUSTED.notice} ${UNTRUSTED.handling[role]}`;
}

const TAG_LOOKALIKE = /<\s*\/?\s*untrusted_candidate_data\s*>/gi;

/**
 * Wrap candidate-derived content in the untrusted-data tags. Any copy of the
 * tags inside the content is neutralized so it cannot close the wrapper early.
 */
export function wrapUntrusted(content: string): string {
  const safe = content.replace(TAG_LOOKALIKE, "[removed]");
  return `${UNTRUSTED.openTag}\n${safe}\n${UNTRUSTED.closeTag}`;
}

// ── evaluator: manipulation detection ────────────────────────────────────────

const EVALUATOR = promptsJson.evaluator;

export const MANIPULATION_CLASSIFICATIONS: string[] =
  EVALUATOR.manipulationClassifications;
export const MANIPULATION_SOURCES: string[] = EVALUATOR.manipulationSources;

// Caps on what one evaluation may store.
export const MANIPULATION_MAX_ATTEMPTS = 10;
export const MANIPULATION_QUOTE_MAX_CHARS = 500;
// A quote this short matches almost anything, so it proves nothing.
export const MANIPULATION_QUOTE_MIN_CHARS = 8;

export interface ManipulationAttempt {
  quote: string;
  classification: string;
  source: string;
}

/** The MANIPULATION ATTEMPTS block of the evaluator system prompt. */
export function manipulationPromptSection(): string {
  return EVALUATOR.manipulationSection.join("\n");
}

/** JSON schema of the `manipulation_attempts` tool field. */
export function buildManipulationToolSchema(): Record<string, unknown> {
  return {
    type: "array",
    description:
      "Manipulation attempts by the candidate, each with a VERBATIM quote. " +
      "Empty list when there are none (the normal case).",
    items: {
      type: "object",
      properties: {
        quote: {
          type: "string",
          description: "The candidate's exact words, copied verbatim.",
        },
        classification: { type: "string", enum: MANIPULATION_CLASSIFICATIONS },
        source: { type: "string", enum: MANIPULATION_SOURCES },
      },
      required: ["quote", "classification", "source"],
    },
  };
}

// Case, whitespace and quote-style insensitive, nothing looser: the quote
// still has to be the words that are actually there.
function normalizeForQuoteMatch(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Anti-fabrication, enforced in code: keep only attempts whose quote really
 * appears in the candidate-derived text the evaluator was shown. No evidence,
 * no claim.
 */
export function keepVerbatimAttempts(
  attempts: ManipulationAttempt[],
  candidateText: string
): ManipulationAttempt[] {
  const haystack = normalizeForQuoteMatch(candidateText);
  const kept: ManipulationAttempt[] = [];
  for (const attempt of attempts) {
    const quote = attempt.quote.trim().slice(0, MANIPULATION_QUOTE_MAX_CHARS);
    const needle = normalizeForQuoteMatch(quote);
    if (needle.length < MANIPULATION_QUOTE_MIN_CHARS) continue;
    if (!haystack.includes(needle)) continue;
    kept.push({ ...attempt, quote });
    if (kept.length >= MANIPULATION_MAX_ATTEMPTS) break;
  }
  return kept;
}
