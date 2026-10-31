import type { ApplicationStatus, Level } from "@prisma/client";
import { RUBRIC } from "@/lib/ai/rubric";

// Level ordering for the pass rule: a candidate passes a job when their
// interview tier rank is >= the job's required level rank.
export const LEVEL_RANK: Record<Level, number> = {
  entry: 0,
  novice: 1,
  advanced: 2,
  expert: 3,
};

export const TIER_LABELS: Record<Level, string> = {
  entry: "Entry",
  novice: "Novice",
  advanced: "Advanced",
  expert: "Expert",
};

// Tier badge colors: entry gray, novice blue, advanced green, expert gold.
export const TIER_BADGE_CLASS: Record<Level, string> = {
  entry: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200",
  novice: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  advanced: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  expert: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
};

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  draft: "Draft",
  // Display label only — the `submitted` enum value / filter param are unchanged.
  submitted: "Ongoing",
  interview_completed: "Interview completed",
  passed: "Passed",
  failed: "Failed",
  archived: "Archived",
};

// Design-system status pill colours (brand tokens from app/globals.css).
// Draft/Archived aren't in the design — neutral brand-container / ink-secondary.
export const APPLICATION_STATUS_BADGE_CLASS: Record<ApplicationStatus, string> =
  {
    draft: "bg-brand-container text-brand-ink-secondary",
    submitted: "bg-tag-3 text-accent-1",
    interview_completed: "bg-status-success text-accent-3",
    passed: "bg-status-success text-accent-3",
    failed: "bg-status-fail text-accent-2",
    archived: "bg-brand-container text-brand-ink-secondary",
  };

// Where a given application should link to, based on its status.
export function applicationPath(id: string, status: ApplicationStatus): string {
  const interviewed =
    status === "interview_completed" ||
    status === "passed" ||
    status === "failed" ||
    status === "archived";
  return `/candidate/applications/${id}/${interviewed ? "result" : "interview"}`;
}

export function scoreToPercent(score: number): number {
  return Math.round(score * 100);
}

// InterviewResult.durationSeconds -> "7m 22s" / "48s". Null (pre-U4 rows, or a
// tier that didn't report one) renders as an em dash.
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return "—";
  const whole = Math.round(seconds);
  const minutes = Math.floor(whole / 60);
  const rest = whole % 60;
  return minutes > 0 ? `${minutes}m ${rest}s` : `${rest}s`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 2.3 — fit evaluation (real Claude grading)
// ─────────────────────────────────────────────────────────────────────────────

export type Recommendation = "hire" | "consider" | "pass";

// Labels live in lib/recommendation.ts (one mapping for every audience).

export const RECOMMENDATION_BADGE_CLASS: Record<Recommendation, string> = {
  hire: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  consider: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  pass: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200",
};

// Candidate-facing text colour for the RECOMMENDATION stat, keyed by VALUE
// (not by pass/fail outcome). NOTE: "pass" means the employer passes ON the
// candidate — a rejection — which is why it is red. The colour is what
// disambiguates the word, so it must stay keyed to the value.
export const RECOMMENDATION_TEXT_CLASS: Record<Recommendation, string> = {
  hire: "text-accent-3",
  consider: "text-amber-600",
  pass: "text-accent-2",
};

// Strongest recommendation sorts first (higher rank = stronger).
export const RECOMMENDATION_RANK: Record<Recommendation, number> = {
  hire: 2,
  consider: 1,
  pass: 0,
};

export function recommendationRank(value: string | null | undefined): number {
  if (value && value in RECOMMENDATION_RANK) {
    return RECOMMENDATION_RANK[value as Recommendation];
  }
  return -1; // no result / unknown sorts last
}

export function isRecommendation(value: unknown): value is Recommendation {
  return value === "hire" || value === "consider" || value === "pass";
}

// A single piece of fit evidence noted by the grader.
export type EvidenceItem = {
  dimension: string;
  evidence: string;
  impact: "positive" | "negative";
};

// The strengths/concerns columns are Prisma `Json` — coerce defensively so a
// malformed value never crashes a page render.
export function parseEvidence(json: unknown): EvidenceItem[] {
  if (!Array.isArray(json)) return [];
  const out: EvidenceItem[] = [];
  for (const item of json) {
    if (
      item &&
      typeof item === "object" &&
      typeof (item as Record<string, unknown>).dimension === "string" &&
      typeof (item as Record<string, unknown>).evidence === "string"
    ) {
      const record = item as Record<string, unknown>;
      out.push({
        dimension: record.dimension as string,
        evidence: record.evidence as string,
        impact: record.impact === "negative" ? "negative" : "positive",
      });
    }
  }
  return out;
}

// Humanize a snake_case dimension like "technical_depth" → "Technical depth".
export function humanizeDimension(dimension: string): string {
  const spaced = dimension.replace(/_/g, " ").trim();
  return spaced ? spaced.charAt(0).toUpperCase() + spaced.slice(1) : dimension;
}

// ─────────────────────────────────────────────────────────────────────────────
// Rubric scoring display (Session 3) — verdict bands, breakdown parsing, and
// the candidate-side qualitative impressions. Labels come from
// shared/interview-rubric.json (via lib/ai/rubric.ts); only colors/thresholds
// live here.
// ─────────────────────────────────────────────────────────────────────────────

export type RubricVerdict = "strong_pass" | "pass" | "borderline" | "fail";

export function isRubricVerdict(value: unknown): value is RubricVerdict {
  return (
    value === "strong_pass" ||
    value === "pass" ||
    value === "borderline" ||
    value === "fail"
  );
}

// Band display names from the rubric JSON (Strong Pass / Pass / Borderline /
// Fail) — never hand-duplicated here.
export const VERDICT_LABELS: Record<RubricVerdict, string> = Object.fromEntries(
  RUBRIC.scoreBands.map((band) => [band.key, band.displayName])
) as Record<RubricVerdict, string>;

export const VERDICT_BADGE_CLASS: Record<RubricVerdict, string> = {
  strong_pass:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  pass: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  borderline:
    "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  fail: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

// ── stored-breakdown parsing (InterviewResult.rubricScoresJson) ──────────────

export type RubricSubScoreView = {
  key: string;
  displayName: string;
  score: number; // 1-5
  evidence: string | null; // null = no evidence in this interview
};

export type RubricCategoryView = {
  key: string;
  displayName: string;
  weightPercent: number;
  categoryScore: number; // 1-5
  subCriteria: RubricSubScoreView[];
};

export type RubricBreakdownView = {
  passingBar: string; // "selective" | "standard"
  verdictBeforeGates: string | null;
  categories: RubricCategoryView[];
};

// rubricScoresJson is a Prisma `Json` column — coerce defensively so a
// malformed value renders as "no rubric data" (fallback view) instead of
// crashing the page. Old (pre-rubric) rows have null here.
export function parseRubricBreakdown(json: unknown): RubricBreakdownView | null {
  if (!json || typeof json !== "object" || Array.isArray(json)) return null;
  const root = json as Record<string, unknown>;
  if (!Array.isArray(root.categories) || root.categories.length === 0) {
    return null;
  }

  const categories: RubricCategoryView[] = [];
  for (const cat of root.categories) {
    if (!cat || typeof cat !== "object") return null;
    const c = cat as Record<string, unknown>;
    if (
      typeof c.key !== "string" ||
      typeof c.displayName !== "string" ||
      typeof c.categoryScore !== "number" ||
      !Array.isArray(c.subCriteria)
    ) {
      return null;
    }
    const subCriteria: RubricSubScoreView[] = [];
    for (const sub of c.subCriteria) {
      if (!sub || typeof sub !== "object") return null;
      const s = sub as Record<string, unknown>;
      if (
        typeof s.key !== "string" ||
        typeof s.displayName !== "string" ||
        typeof s.score !== "number"
      ) {
        return null;
      }
      subCriteria.push({
        key: s.key,
        displayName: s.displayName,
        score: s.score,
        evidence: typeof s.evidence === "string" && s.evidence.trim() ? s.evidence : null,
      });
    }
    categories.push({
      key: c.key,
      displayName: c.displayName,
      weightPercent: typeof c.weightPercent === "number" ? c.weightPercent : 0,
      categoryScore: c.categoryScore,
      subCriteria,
    });
  }

  return {
    passingBar: root.passingBar === "standard" ? "standard" : "selective",
    verdictBeforeGates:
      typeof root.verdictBeforeGates === "string" ? root.verdictBeforeGates : null,
    categories,
  };
}

// Mean of every rubric sub-criterion score (1-5), one decimal, for the
// "Average score" stat. Null when the result has no rubric data.
export function rubricAverageScore(
  breakdown: RubricBreakdownView | null
): string | null {
  if (!breakdown) return null;
  const scores = breakdown.categories.flatMap((cat) =>
    cat.subCriteria.map((sub) => sub.score)
  );
  if (scores.length === 0) return null;
  return (scores.reduce((sum, n) => sum + n, 0) / scores.length).toFixed(1);
}

// ── gates (InterviewResult.gatesFiredJson) ───────────────────────────────────

export type RubricGateView = {
  gate: string; // "communication_floor" | "must_have_below_bar" | "integrity"
  capsVerdictAt: string;
  criteria: { key: string; score: number }[]; // must_have_below_bar only
};

export function parseGatesFired(json: unknown): RubricGateView[] {
  if (!Array.isArray(json)) return [];
  const out: RubricGateView[] = [];
  for (const item of json) {
    if (!item || typeof item !== "object") continue;
    const g = item as Record<string, unknown>;
    if (typeof g.gate !== "string" || typeof g.capsVerdictAt !== "string") {
      continue;
    }
    const criteria: { key: string; score: number }[] = [];
    if (Array.isArray(g.criteria)) {
      for (const c of g.criteria) {
        if (
          c &&
          typeof c === "object" &&
          typeof (c as Record<string, unknown>).key === "string" &&
          typeof (c as Record<string, unknown>).score === "number"
        ) {
          criteria.push({
            key: (c as Record<string, unknown>).key as string,
            score: (c as Record<string, unknown>).score as number,
          });
        }
      }
    }
    out.push({ gate: g.gate, capsVerdictAt: g.capsVerdictAt, criteria });
  }
  return out;
}

// ── candidate-side qualitative impressions (NO numbers exposed) ──────────────

export type CategoryImpression = "strong" | "solid" | "developing" | "limited";

// Fixed thresholds mapping a 1-5 category score onto a qualitative label:
//   >= 4.0 → Strong ("exceeds" territory)
//   >= 3.0 → Solid (meets expectations)
//   >= 2.0 → Developing (partially there)
//   <  2.0 → Limited (clearly below)
export function categoryImpression(categoryScore: number): CategoryImpression {
  if (categoryScore >= 4.0) return "strong";
  if (categoryScore >= 3.0) return "solid";
  if (categoryScore >= 2.0) return "developing";
  return "limited";
}

export const IMPRESSION_LABELS: Record<CategoryImpression, string> = {
  strong: "Strong",
  solid: "Solid",
  developing: "Developing",
  limited: "Limited",
};

// Chip colours for the candidate result card. Four DISTINCT colours, per the
// designer: green / blue / amber / red. Thresholds live in categoryImpression
// and are NOT affected by this map.
// The amber pair (design #FFF4EC / #D49102) has no brand token; Tailwind's
// built-in amber is the closest match and is shared with RECOMMENDATION_TEXT_CLASS
// so "Developing" and "Consider" read as the same warning colour.
export const IMPRESSION_BADGE_CLASS: Record<CategoryImpression, string> = {
  strong: "bg-status-success text-accent-3",
  solid: "bg-tag-3 text-accent-1",
  developing: "bg-amber-50 text-amber-600",
  limited: "bg-status-fail text-accent-2",
};
