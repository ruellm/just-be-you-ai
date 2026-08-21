import type { ApplicationStatus, Level } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  APPLICATION_STATUS_BADGE_CLASS,
  APPLICATION_STATUS_LABELS,
  isRecommendation,
  isRubricVerdict,
  RECOMMENDATION_BADGE_CLASS,
  RECOMMENDATION_LABELS,
  TIER_BADGE_CLASS,
  TIER_LABELS,
  VERDICT_BADGE_CLASS,
  VERDICT_LABELS,
} from "@/lib/applications";

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <Badge
      className={cn(
        "rounded-[8px] border-transparent font-body text-meta font-medium",
        APPLICATION_STATUS_BADGE_CLASS[status]
      )}
    >
      {APPLICATION_STATUS_LABELS[status]}
    </Badge>
  );
}

export function TierBadge({
  tier,
  className,
}: {
  tier: Level;
  className?: string;
}) {
  return (
    <Badge className={cn("border-transparent", TIER_BADGE_CLASS[tier], className)}>
      {TIER_LABELS[tier]}
    </Badge>
  );
}

// Rubric verdict band (Strong Pass / Pass / Borderline / Fail) — labels come
// from shared/interview-rubric.json. Renders nothing for an unknown/null value
// so old (pre-rubric) rows stay clean.
export function VerdictBadge({
  verdict,
  className,
}: {
  verdict: string | null | undefined;
  className?: string;
}) {
  if (!isRubricVerdict(verdict)) return null;
  return (
    <Badge
      className={cn("border-transparent", VERDICT_BADGE_CLASS[verdict], className)}
    >
      {VERDICT_LABELS[verdict]}
    </Badge>
  );
}

// Phase 2.3 — the grader's hire/consider/pass recommendation. Renders nothing
// for an unknown value so old rows without a recommendation stay clean.
export function RecommendationBadge({
  recommendation,
  className,
}: {
  recommendation: string | null | undefined;
  className?: string;
}) {
  if (!isRecommendation(recommendation)) return null;
  return (
    <Badge
      className={cn(
        "border-transparent",
        RECOMMENDATION_BADGE_CLASS[recommendation],
        className
      )}
    >
      {RECOMMENDATION_LABELS[recommendation]}
    </Badge>
  );
}
