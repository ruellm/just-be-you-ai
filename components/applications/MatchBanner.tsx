import {
  matchBannerText,
  matchBannerVariant,
  type MatchBannerVariant,
  type MatchSummary,
} from "@/lib/match/match-display";
import { cn } from "@/lib/utils";

// Resume-vs-job match line at the top of the Fit Summary card. Business and
// admin views only; candidates never see the match. Renders nothing when the
// match has not been computed.

const VARIANT_CLASS: Record<MatchBannerVariant, string> = {
  success: "border-accent-3 bg-status-success text-accent-3",
  warning: "border-accent-4 bg-status-pending text-amber-800",
  fail: "border-accent-2 bg-status-fail text-accent-2",
};

export function MatchBanner({ match }: { match: MatchSummary | null }) {
  if (!match) return null;
  return (
    <p
      className={cn(
        "rounded-[12px] border px-5 py-4 text-body font-medium tracking-[-0.1px]",
        VARIANT_CLASS[matchBannerVariant(match)]
      )}
    >
      {matchBannerText(match)}
    </p>
  );
}
