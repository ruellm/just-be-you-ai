import type { ReactNode } from "react";
import { CircleCheck, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  categoryImpression,
  humanizeDimension,
  IMPRESSION_BADGE_CLASS,
  IMPRESSION_LABELS,
  type EvidenceItem,
  type RubricBreakdownView,
} from "@/lib/applications";
import { cn } from "@/lib/utils";

// Presentation pieces for the candidate result page. Server-safe (no hooks).

export function ResultCard({
  title,
  children,
  className,
}: {
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "flex flex-col gap-4 rounded-[12px] border border-brand-border bg-brand-surface p-6 sm:p-7",
        className
      )}
    >
      {title ? (
        <h2 className="text-2xl font-semibold text-brand-primary">{title}</h2>
      ) : null}
      {children}
    </section>
  );
}

// "How you came across" — qualitative per-category word labels ONLY. The
// candidate view deliberately shows no numeric score, tier, or recommendation.
export function ImpressionList({
  breakdown,
}: {
  breakdown: RubricBreakdownView;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold tracking-[1.2px] text-brand-ink-secondary uppercase">
        How you came across
      </p>
      <ul className="grid gap-2">
        {breakdown.categories.map((category) => {
          const impression = categoryImpression(category.categoryScore);
          return (
            <li
              key={category.key}
              className="flex items-center justify-between gap-2 rounded-[8px] border border-brand-border bg-brand-container px-3 py-2 text-sm text-brand-ink"
            >
              <span>{category.displayName}</span>
              <Badge
                className={cn(
                  "rounded-[6px] border-transparent font-body",
                  IMPRESSION_BADGE_CLASS[impression]
                )}
              >
                {IMPRESSION_LABELS[impression]}
              </Badge>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function StrengthsList({ items }: { items: EvidenceItem[] }) {
  return (
    <ul className="space-y-4">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3 text-base text-brand-ink-secondary">
          <CircleCheck className="mt-0.5 size-5 shrink-0 text-accent-3" />
          <span>
            <span className="font-medium text-brand-ink">
              {humanizeDimension(item.dimension)}:
            </span>{" "}
            {item.evidence}
          </span>
        </li>
      ))}
    </ul>
  );
}

// ── Locked / paywalled variant (built, NOT wired) ───────────────────────────
// For future monetization: when a candidate is on the free plan the Fit
// Summary + Strengths cards will be replaced by this panel. There is no
// subscription data yet, so callers pass `locked={false}` (see RESULT_LOCKED
// in page.tsx). Do not add subscription checks or an upgrade route here.
export function LockedFeedbackPanel() {
  return (
    <div className="relative flex flex-col items-center justify-center gap-3 overflow-hidden rounded-[8px] bg-tag-2 px-6 py-10 text-center text-white">
      {/* Obscured "content" behind the message, for the blurred feel. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-30 blur-sm"
      >
        <div className="mx-6 mt-6 h-3 rounded bg-white/60" />
        <div className="mx-6 mt-3 h-3 w-4/5 rounded bg-white/50" />
        <div className="mx-6 mt-3 h-3 w-3/5 rounded bg-white/40" />
        <div className="mx-6 mt-8 h-3 rounded bg-white/50" />
        <div className="mx-6 mt-3 h-3 w-2/3 rounded bg-white/40" />
      </div>
      <Lock className="relative size-7" />
      <p className="relative text-base font-medium">Unlock to View Feedback</p>
      <p className="relative max-w-xs text-sm text-white/90">
        Full score &amp; detailed feedback are only visible to those who are
        part of the Professional plan.
      </p>
      <Button
        type="button"
        className="relative mt-2 h-[39px] rounded-[12px] bg-brand-tertiary px-5 text-sm font-medium text-brand-ink hover:bg-brand-tertiary/90"
      >
        Upgrade to Professional
      </Button>
    </div>
  );
}
