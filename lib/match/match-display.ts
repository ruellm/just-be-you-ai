// Read side of the resume-vs-job match stored on Application (matchPercent +
// matchJson). Pure helpers, safe for client components. The banner sentence is
// built here from stored data, never taken from the model.

export type MatchRequirementKind = "skill" | "experience" | "education" | "other";
export type MatchRequirementStatus = "met" | "partial" | "unmet";

export type MatchRequirement = {
  requirement: string;
  kind: MatchRequirementKind;
  status: MatchRequirementStatus;
  gapLabel: string | null;
};

export type MatchJson = {
  requirements: MatchRequirement[];
  unmetQualifiers: string[];
};

export type MatchSummary = {
  percent: number;
  unmetQualifiers: string[];
};

export type MatchBannerVariant = "success" | "warning" | "fail";

// Below this match percent a candidate with gaps is shown in red, not amber.
export const MATCH_WARNING_FLOOR = 70;

const KINDS: MatchRequirementKind[] = ["skill", "experience", "education", "other"];
const STATUSES: MatchRequirementStatus[] = ["met", "partial", "unmet"];

export function parseMatchJson(json: unknown): MatchJson | null {
  if (!json || typeof json !== "object" || Array.isArray(json)) return null;
  const root = json as Record<string, unknown>;
  if (!Array.isArray(root.requirements)) return null;

  const requirements: MatchRequirement[] = [];
  for (const item of root.requirements) {
    if (!item || typeof item !== "object") return null;
    const r = item as Record<string, unknown>;
    if (
      typeof r.requirement !== "string" ||
      !KINDS.includes(r.kind as MatchRequirementKind) ||
      !STATUSES.includes(r.status as MatchRequirementStatus)
    ) {
      return null;
    }
    requirements.push({
      requirement: r.requirement,
      kind: r.kind as MatchRequirementKind,
      status: r.status as MatchRequirementStatus,
      gapLabel: typeof r.gapLabel === "string" && r.gapLabel.trim() ? r.gapLabel : null,
    });
  }

  const unmetQualifiers = Array.isArray(root.unmetQualifiers)
    ? root.unmetQualifiers.filter(
        (q): q is string => typeof q === "string" && q.trim().length > 0
      )
    : [];

  return { requirements, unmetQualifiers };
}

// What a results page needs for the banner. Null when no match was computed.
export function parseMatchSummary(
  matchPercent: number | null | undefined,
  matchJson: unknown
): MatchSummary | null {
  if (matchPercent == null || !Number.isFinite(matchPercent)) return null;
  const percent = Math.max(0, Math.min(100, Math.round(matchPercent)));
  const parsed = parseMatchJson(matchJson);
  return { percent, unmetQualifiers: parsed?.unmetQualifiers.slice(0, 3) ?? [] };
}

function joinQualifiers(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

export function matchBannerText(match: MatchSummary): string {
  if (match.unmetQualifiers.length === 0) {
    return `This candidate shows ${match.percent}% match and meets all required qualifiers.`;
  }
  return `This candidate shows ${match.percent}% match, but lacks ${joinQualifiers(
    match.unmetQualifiers
  )}.`;
}

export function matchBannerVariant(match: MatchSummary): MatchBannerVariant {
  if (match.unmetQualifiers.length === 0) return "success";
  return match.percent >= MATCH_WARNING_FLOOR ? "warning" : "fail";
}
