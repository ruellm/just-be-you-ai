// Weighted-rubric scoring: typed access to shared/interview-rubric.json plus
// the DETERMINISTIC decision engine (category scores → composite → verdict →
// hard gates). No model calls here — the model only produces per-sub-criterion
// 1-5 scores (see evaluate-interview.ts); everything downstream of those
// scores is plain code so it is reproducible and auditable.
//
// MIRROR: voice-agent/lib/rubric.py is the byte-for-byte logical twin of this
// module (same prompt text, same tool schema, same formulas, same rounding).
// If you change one, change the other. The rubric itself lives ONLY in
// shared/interview-rubric.json — never inline rubric content here.
//
// Formulas (documented in the rubric JSON notes as well):
//   categoryScore  = mean of its sub-criterion scores           (1-5)
//   selective bar  : composite = Σ (weight/Σweights) * ((categoryScore-1)/4) * 100
//                    → straight 3s ("meets") = 50 = fail
//   standard bar   : piecewise-linear remap of the selective composite x:
//                    x <= 50 → 1.4*x ; x > 50 → 70 + 0.6*(x-50)
//                    → straight 3s = 70 = pass, all-1s = 0, all-5s = 100
//   Composite is rounded half-up to 1 decimal BEFORE banding.
//   Gates (verdict caps, applied after banding):
//     communication category <= 20 on its 0-100 scale → cap "fail"
//     any must-have sub-criterion <= 2                → cap "borderline"
//     integrity (DORMANT hook — nothing triggers it)  → cap "fail"

import rubricJson from "@/shared/interview-rubric.json";

// ── types ────────────────────────────────────────────────────────────────────

export interface RubricSubCriterion {
  key: string;
  displayName: string;
  anchors: { below: string; meets: string; exceeds: string };
}

export interface RubricCategory {
  key: string;
  displayName: string;
  weight: number; // relative integer; normalize by the sum
  weightPercent: number; // display-only
  subCriteria: RubricSubCriterion[];
}

export interface Rubric {
  version: number;
  key: string;
  displayName: string;
  scale: { min: number; max: number; bands: Record<string, string> };
  categories: RubricCategory[];
  scoreBands: { key: string; displayName: string; min: number; max: number }[];
  defaultMustHave: string[];
}

export type PassingBar = "selective" | "standard";
export type Verdict = "strong_pass" | "pass" | "borderline" | "fail";

/** One model-produced sub-criterion score. evidence null = no evidence found. */
export interface SubScore {
  score: number; // integer 1-5
  evidence: string | null;
}

export type RubricScores = Record<string, SubScore>; // keyed by sub-criterion key

export interface GateFired {
  gate: "communication_floor" | "must_have_below_bar" | "integrity";
  capsVerdictAt: Verdict;
  // gate-specific detail:
  categoryScore?: number; // communication_floor
  categoryScore100?: number; // communication_floor
  criteria?: { key: string; score: number }[]; // must_have_below_bar
  reason?: string; // integrity
}

export interface RubricDecision {
  categoryScores: Record<string, number>; // 1-5, per category key
  composite: number; // 0-100, per the selected bar, rounded to 1 decimal
  passingBar: PassingBar;
  verdictBeforeGates: Verdict;
  verdict: Verdict;
  gatesFired: GateFired[];
  passed: boolean; // verdict is pass/strong_pass
  tier: "entry" | "novice" | "advanced" | "expert"; // legacy column mapping
  legacyScore: number; // composite/100 for the legacy 0-1 `score` column
}

// ── rubric access ────────────────────────────────────────────────────────────

export const RUBRIC = rubricJson as unknown as Rubric;

export const ALL_SUB_CRITERION_KEYS: string[] = RUBRIC.categories.flatMap((c) =>
  c.subCriteria.map((s) => s.key)
);

const SUM_OF_WEIGHTS = RUBRIC.categories.reduce((a, c) => a + c.weight, 0);

const VERDICT_RANK: Record<Verdict, number> = {
  fail: 0,
  borderline: 1,
  pass: 2,
  strong_pass: 3,
};

// verdict → legacy Level tier for the existing `tier` column/badges.
const VERDICT_TIER: Record<Verdict, RubricDecision["tier"]> = {
  strong_pass: "expert",
  pass: "advanced",
  borderline: "novice",
  fail: "entry",
};

/**
 * Resolve a job's must-have keys: a valid string array (filtered to known
 * sub-criterion keys, explicit [] respected = no must-haves) or, for
 * null/malformed values, the rubric's defaultMustHave set.
 */
export function resolveMustHaveKeys(jobMustHaveCriteriaJson: unknown): string[] {
  if (
    Array.isArray(jobMustHaveCriteriaJson) &&
    jobMustHaveCriteriaJson.every((k) => typeof k === "string")
  ) {
    return jobMustHaveCriteriaJson.filter((k) =>
      ALL_SUB_CRITERION_KEYS.includes(k)
    );
  }
  return [...RUBRIC.defaultMustHave];
}

/** "standard" passes through; anything else (incl. null) = "selective". */
export function resolvePassingBar(jobPassingBar: unknown): PassingBar {
  return jobPassingBar === "standard" ? "standard" : "selective";
}

// ── prompt + tool-schema builders (rendered from the JSON, never hardcoded) ──

/**
 * The rubric block of the scoring system prompt. MIRROR: rubric.py renders the
 * identical text.
 */
export function buildRubricPromptBlock(): string {
  const lines: string[] = [];
  for (const cat of RUBRIC.categories) {
    lines.push(`# ${cat.displayName} (${cat.weightPercent}% of the composite)`);
    for (const sub of cat.subCriteria) {
      lines.push(
        `- [${sub.key}] ${sub.displayName} — Below (1-2): ${sub.anchors.below} ` +
          `| Meets (3): ${sub.anchors.meets} | Exceeds (4-5): ${sub.anchors.exceeds}`
      );
    }
    lines.push("");
  }
  return lines.join("\n").trimEnd();
}

/**
 * JSON Schema for the `rubric_scores` tool property: one required object per
 * sub-criterion, {score: 1-5 integer, evidence: string|null}.
 */
export function buildRubricScoresToolSchema(): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  for (const cat of RUBRIC.categories) {
    for (const sub of cat.subCriteria) {
      properties[sub.key] = {
        type: "object",
        description: `${sub.displayName} (${cat.displayName})`,
        properties: {
          score: { type: "integer", minimum: 1, maximum: 5 },
          evidence: {
            type: ["string", "null"],
            description:
              "Short verbatim transcript excerpt justifying the score, " +
              "or null if the interview produced no evidence for it.",
          },
        },
        required: ["score", "evidence"],
      };
    }
  }
  return {
    type: "object",
    description:
      "Score EVERY sub-criterion of the rubric, 1-5, with an evidence quote.",
    properties,
    required: ALL_SUB_CRITERION_KEYS,
  };
}

// ── decision engine (deterministic, no model) ────────────────────────────────

/** Round half-up to 1 decimal — mirrored exactly in rubric.py (_round1). */
function round1(x: number): number {
  return Math.floor(x * 10 + 0.5) / 10;
}

function bandFor(composite: number): Verdict {
  const bands = [...RUBRIC.scoreBands].sort((a, b) => b.min - a.min);
  for (const band of bands) {
    if (composite >= band.min) return band.key as Verdict;
  }
  return bands[bands.length - 1].key as Verdict;
}

/**
 * Turn the model's per-sub-criterion scores into the final outcome.
 *
 * @param scores must contain every rubric sub-criterion key (validated by the
 *   caller against the model output).
 * @param integrityFlag DORMANT hook — no integrity detection exists yet, so
 *   callers never pass it; when detection lands, a truthy reason string caps
 *   the verdict at fail via the integrity gate.
 */
export function decideOutcome(
  scores: RubricScores,
  opts: {
    passingBar: PassingBar;
    mustHaveKeys: string[];
    integrityFlag?: string | null;
  }
): RubricDecision {
  // 1. Category scores: mean of sub-criterion scores (1-5).
  const categoryScores: Record<string, number> = {};
  for (const cat of RUBRIC.categories) {
    const subScores = cat.subCriteria.map((s) => scores[s.key].score);
    categoryScores[cat.key] =
      subScores.reduce((a, b) => a + b, 0) / subScores.length;
  }

  // 2. Composite via the selected passing curve.
  //    selective: Σ (weight/Σweights) * ((categoryScore-1)/4) * 100
  const selective = RUBRIC.categories.reduce(
    (sum, cat) =>
      sum +
      (cat.weight / SUM_OF_WEIGHTS) * ((categoryScores[cat.key] - 1) / 4) * 100,
    0
  );
  //    standard: x <= 50 → 1.4*x ; x > 50 → 70 + 0.6*(x-50)
  const raw =
    opts.passingBar === "standard"
      ? selective <= 50
        ? 1.4 * selective
        : 70 + 0.6 * (selective - 50)
      : selective;
  const composite = round1(raw);

  // 3. Band.
  const verdictBeforeGates = bandFor(composite);

  // 4. Hard gates — verdict caps, applied after banding.
  const gatesFired: GateFired[] = [];

  const commScore = categoryScores["communication"];
  const comm100 = round1(((commScore - 1) / 4) * 100);
  if (comm100 <= 20) {
    gatesFired.push({
      gate: "communication_floor",
      capsVerdictAt: "fail",
      categoryScore: commScore,
      categoryScore100: comm100,
    });
  }

  const lowMustHaves = opts.mustHaveKeys
    .filter((k) => scores[k] && scores[k].score <= 2)
    .map((k) => ({ key: k, score: scores[k].score }));
  if (lowMustHaves.length > 0) {
    gatesFired.push({
      gate: "must_have_below_bar",
      capsVerdictAt: "borderline",
      criteria: lowMustHaves,
    });
  }

  // Integrity gate: DORMANT. Nothing sets integrityFlag yet; the hook exists
  // so a future integrity detector only has to supply a reason string.
  if (opts.integrityFlag) {
    gatesFired.push({
      gate: "integrity",
      capsVerdictAt: "fail",
      reason: opts.integrityFlag,
    });
  }

  let verdict = verdictBeforeGates;
  for (const gate of gatesFired) {
    if (VERDICT_RANK[gate.capsVerdictAt] < VERDICT_RANK[verdict]) {
      verdict = gate.capsVerdictAt;
    }
  }

  // 5. Legacy contract.
  const passed = verdict === "pass" || verdict === "strong_pass";

  return {
    categoryScores,
    composite,
    passingBar: opts.passingBar,
    verdictBeforeGates,
    verdict,
    gatesFired,
    passed,
    tier: VERDICT_TIER[verdict],
    legacyScore: composite / 100,
  };
}

/**
 * The full breakdown persisted to InterviewResult.rubricScoresJson — includes
 * display names + weights (snapshotted from the rubric) and which bar applied,
 * so the Session-3 views can render without re-joining the rubric config.
 */
export function buildRubricScoresJson(
  scores: RubricScores,
  decision: RubricDecision
): Record<string, unknown> {
  return {
    rubricKey: RUBRIC.key,
    rubricVersion: RUBRIC.version,
    passingBar: decision.passingBar,
    verdictBeforeGates: decision.verdictBeforeGates,
    categories: RUBRIC.categories.map((cat) => ({
      key: cat.key,
      displayName: cat.displayName,
      weight: cat.weight,
      weightPercent: cat.weightPercent,
      categoryScore: decision.categoryScores[cat.key],
      subCriteria: cat.subCriteria.map((sub) => ({
        key: sub.key,
        displayName: sub.displayName,
        score: scores[sub.key].score,
        evidence: scores[sub.key].evidence,
      })),
    })),
  };
}
