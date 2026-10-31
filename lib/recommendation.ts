import { isRecommendation, type Recommendation } from "@/lib/applications";

// The grader's hire/consider/pass is stored as written, but what we show has
// to agree with the pass/fail outcome of the same result: a failed candidate
// never sees a positive recommendation, and a passed one never sees a
// rejection. "pass" is the rejection value (the employer passes on them).
export const REJECTION_RECOMMENDATION: Recommendation = "pass";

export function displayedRecommendation(
  stored: string | null | undefined,
  passed: boolean
): Recommendation | null {
  if (!passed) return REJECTION_RECOMMENDATION;
  if (!isRecommendation(stored)) return null;
  return stored === REJECTION_RECOMMENDATION ? "consider" : stored;
}

// The only recommendation-to-text mapping, for every audience. Labels follow
// the Figma "Result Status" component; the stored values do not change.
export const RECOMMENDATION_LABELS: Record<Recommendation, string> = {
  hire: "Hire",
  consider: "Consider",
  pass: "Decline",
};

export function recommendationLabel(
  value: Recommendation | null | undefined
): string {
  return value ? RECOMMENDATION_LABELS[value] : "—";
}
