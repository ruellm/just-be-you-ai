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
        <h2 className="text-heading font-semibold text-brand-primary">{title}</h2>
      ) : null}
      {children}
    </section>
  );
}

// ── Score ring ──────────────────────────────────────────────────────────────
// Inline SVG (no asset, no dependency): a light track plus an arc drawn with
// stroke-dasharray to `percent`. Arc + number take the outcome colour via
// currentColor so pass/fail isn't hardcoded to green.
export function ScoreRing({
  percent,
  passed,
}: {
  percent: number;
  passed: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  const radius = 84;
  const circumference = 2 * Math.PI * radius;
  const filled = (clamped / 100) * circumference;
  const tone = passed ? "text-accent-3" : "text-accent-2";

  return (
    <div className="relative size-[200px] shrink-0">
      <svg viewBox="0 0 200 200" className="size-full -rotate-90">
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          strokeWidth="16"
          stroke="currentColor"
          className="text-brand-border/60"
        />
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          strokeWidth="16"
          strokeLinecap="round"
          stroke="currentColor"
          strokeDasharray={`${filled} ${circumference - filled}`}
          className={tone}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
        <span className={cn("font-display text-display font-bold", tone)}>
          {clamped}
        </span>
        <span className="text-small text-brand-ink-secondary">Total Score</span>
      </div>
    </div>
  );
}

// Score ring with the stat rows beside it, or under it when the card is too
// narrow for both. Measured against the card itself (container query), not
// the viewport, because the same card sits in page grids of very different
// widths. `columns` lets wide cards split the stats into two or three columns
// once there is room for them.
export function ScoreSummary({
  percent,
  passed,
  columns = "single",
  children,
}: {
  percent: number;
  passed: boolean;
  columns?: "single" | "wide";
  children: ReactNode;
}) {
  return (
    <div className="@container">
      <div className="flex flex-col items-center gap-6 @sm:flex-row @sm:items-center">
        <ScoreRing percent={percent} passed={passed} />
        <div
          className={cn(
            "grid w-full min-w-0 gap-4 text-center @sm:text-left",
            columns === "wide" && "@xl:grid-cols-2 @3xl:grid-cols-3"
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

// One "PILL LABEL" + value stat row from the role card.
//
// The pill fills its column up to the design width (176px) and shrinks with
// it, so it never runs past the card. Callers place StatRows in a `grid`;
// each row spans two subgrid tracks (pill, value), so pills that share a
// track line up in height even when one wraps. The pill is a block wrapper's
// inline child so the caller's text-align still positions it.
export function StatRow({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="row-span-2 grid min-w-0 grid-rows-subgrid gap-1.5">
      <div className="min-w-0">
        <span className="font-display inline-flex h-full min-h-7 w-full max-w-[176px] min-w-0 items-center justify-center rounded-[8px] bg-tag-1 px-3 py-1 text-center text-meta leading-tight font-medium tracking-[1.2px] [overflow-wrap:anywhere] text-brand-ink-secondary uppercase">
          {label}
        </span>
      </div>
      <p
        className={cn(
          "text-subheading font-semibold text-brand-ink",
          valueClassName
        )}
      >
        {value}
      </p>
    </div>
  );
}

// "How you came across:" — the five rubric categories as a two-column grid of
// inset rows, each with a qualitative chip. Still no numbers, quotes, or gate
// mechanics here; the numeric score lives in the role card beside it.
export function ImpressionGrid({
  breakdown,
}: {
  breakdown: RubricBreakdownView;
}) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {breakdown.categories.map((category) => {
        const impression = categoryImpression(category.categoryScore);
        return (
          <li
            key={category.key}
            className="flex min-h-[69px] min-w-0 items-center justify-between gap-3 rounded-[8px] border border-brand-border bg-brand-secondary/10 px-4 py-3"
          >
            <span className="min-w-0 text-small text-brand-ink">
              {category.displayName}
            </span>
            <Badge
              className={cn(
                "h-[26px] w-[88px] shrink-0 justify-center rounded-[6px] border-[0.5px] border-transparent font-body text-meta font-medium",
                IMPRESSION_BADGE_CLASS[impression]
              )}
            >
              {IMPRESSION_LABELS[impression]}
            </Badge>
          </li>
        );
      })}
    </ul>
  );
}

export function StrengthsList({ items }: { items: EvidenceItem[] }) {
  return (
    <ul className="space-y-4">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3 text-body text-brand-ink-secondary">
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
      <p className="relative text-body font-medium">Unlock to View Feedback</p>
      <p className="relative max-w-xs text-small text-white/90">
        Full score &amp; detailed feedback are only visible to those who are
        part of the Professional plan.
      </p>
      <Button
        type="button"
        className="relative mt-2 h-[39px] rounded-[12px] bg-brand-tertiary px-5 text-small font-medium text-brand-ink hover:bg-brand-tertiary/90"
      >
        Upgrade to Professional
      </Button>
    </div>
  );
}
