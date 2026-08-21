import { AlertTriangle } from "lucide-react";
import { VerdictBadge } from "@/components/applications/Badges";
import {
  parseGatesFired,
  parseRubricBreakdown,
  type RubricBreakdownView,
  type RubricGateView,
} from "@/lib/applications";

// Session 3 — BUSINESS-side full rubric breakdown for one InterviewResult:
// verdict + composite + which passing bar applied, any hard gates that fired,
// and every category/sub-criterion 1-5 score with its evidence quote. Renders
// nothing when the result has no rubric data (old rows) — the caller keeps its
// existing display as the fallback. Business-only: never render this to the
// candidate (it exposes scores, evidence quotes, and gate mechanics).
export function RubricBreakdown({
  rubricScoresJson,
  compositeScore,
  verdict,
  gatesFiredJson,
}: {
  rubricScoresJson: unknown;
  compositeScore: number | null;
  verdict: string | null;
  gatesFiredJson: unknown;
}) {
  const breakdown = parseRubricBreakdown(rubricScoresJson);
  if (!breakdown) return null;
  const gates = parseGatesFired(gatesFiredJson);

  return (
    <div className="space-y-4">
      {/* Verdict + composite + bar */}
      <div>
        <p className="text-muted-foreground text-meta font-medium tracking-wide uppercase">
          Rubric result
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <VerdictBadge verdict={verdict} className="px-3 py-1 text-small" />
          {compositeScore != null ? (
            <span className="text-small font-semibold">{compositeScore} / 100</span>
          ) : null}
          <span className="text-muted-foreground text-small">
            Scored against the{" "}
            {breakdown.passingBar === "standard" ? "Standard" : "Selective"} bar
          </span>
        </div>
      </div>

      {/* Hard gates */}
      {gates.length ? (
        <div className="space-y-2">
          {gates.map((gate, i) => (
            <div
              key={i}
              className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-small text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>{gateDescription(gate, breakdown)}</span>
            </div>
          ))}
        </div>
      ) : null}

      {/* Per-category breakdown */}
      <div className="space-y-3">
        {breakdown.categories.map((cat) => (
          <div key={cat.key} className="rounded-md border p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-small font-medium">
                {cat.displayName}
                {cat.weightPercent ? (
                  <span className="text-muted-foreground ml-1.5 text-meta font-normal">
                    {cat.weightPercent}% weight
                  </span>
                ) : null}
              </p>
              <p className="text-small font-semibold">
                {formatCategoryScore(cat.categoryScore)} / 5
              </p>
            </div>
            <ul className="mt-2 space-y-2">
              {cat.subCriteria.map((sub) => (
                <li key={sub.key} className="text-small">
                  <div className="flex items-baseline gap-2">
                    <span className="text-muted-foreground w-8 shrink-0 font-mono text-meta">
                      {sub.score}/5
                    </span>
                    <span className="font-medium">{sub.displayName}</span>
                  </div>
                  {sub.evidence ? (
                    <p className="text-muted-foreground mt-0.5 pl-10 text-meta italic">
                      &ldquo;{sub.evidence}&rdquo;
                    </p>
                  ) : (
                    <p className="text-muted-foreground mt-0.5 pl-10 text-meta">
                      Not enough evidence in this interview
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

// Trim trailing zeros: 3.5 → "3.5", 4 → "4", 3.25 → "3.25".
function formatCategoryScore(score: number): string {
  return String(Math.round(score * 100) / 100);
}

function gateDescription(
  gate: RubricGateView,
  breakdown: RubricBreakdownView
): string {
  const cappedAt =
    gate.capsVerdictAt === "fail"
      ? "Fail"
      : gate.capsVerdictAt === "borderline"
        ? "Borderline"
        : gate.capsVerdictAt;

  if (gate.gate === "communication_floor") {
    return `Capped at ${cappedAt}: the Communication & Articulation score was too low to pass regardless of other scores.`;
  }
  if (gate.gate === "must_have_below_bar") {
    const names = gate.criteria
      .map((c) => subCriterionName(c.key, breakdown))
      .join(", ");
    return `Capped at ${cappedAt}: ${
      gate.criteria.length === 1 ? "a must-have skill" : "must-have skills"
    } (${names}) scored too low.`;
  }
  if (gate.gate === "integrity") {
    return `Capped at ${cappedAt}: an integrity concern was flagged for this interview.`;
  }
  return `Capped at ${cappedAt} by the "${gate.gate}" gate.`;
}

function subCriterionName(key: string, breakdown: RubricBreakdownView): string {
  for (const cat of breakdown.categories) {
    const sub = cat.subCriteria.find((s) => s.key === key);
    if (sub) return sub.displayName;
  }
  return key;
}
