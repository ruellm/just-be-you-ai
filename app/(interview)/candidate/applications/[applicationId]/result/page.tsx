import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import {
  formatDuration,
  isRecommendation,
  parseEvidence,
  parseRubricBreakdown,
  RECOMMENDATION_LABELS,
  RECOMMENDATION_TEXT_CLASS,
  scoreToPercent,
  TIER_LABELS,
} from "@/lib/applications";
import { cn } from "@/lib/utils";
import { ensureAdvancedGraded } from "@/lib/elevenlabs/ensure-advanced-graded";
import { ResultPending } from "./ResultPending";
import {
  ImpressionGrid,
  LockedFeedbackPanel,
  ResultCard,
  ScoreRing,
  StatRow,
  StrengthsList,
} from "./ResultCards";

// Future monetization: when true, the Fit Summary + Strengths cards are
// replaced by the paywalled LockedFeedbackPanel. There is no subscription
// data yet, so this is a constant that always resolves to "unlocked" — do
// NOT derive it from anything until the plan model exists.
const RESULT_LOCKED = false;

export default async function ResultPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = await params;

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const profile = await prisma.candidateProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!profile) redirect("/candidate/profile");

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    select: {
      id: true,
      candidateProfileId: true,
      status: true,
      // Company name is no longer rendered anywhere on this page (U4 #20).
      job: { select: { title: true } },
      interviewResult: true,
    },
  });

  if (!application || application.candidateProfileId !== profile.id) {
    notFound();
  }

  // Guard priority (see the Phase 2.3 interview→result loop fix):
  //   a. Result row exists → render it (falls through below).
  //   b. No result yet, but the interview has ended (grading in flight, or a
  //      terminal status) → show the "Finalizing…" pending state. NEVER bounce
  //      back to /interview — that's what caused the redirect loop.
  //   c. No result AND still submitted/draft → the candidate genuinely hasn't
  //      interviewed; send them to the interview.
  //   d. Anything unexpected → pending (safer than bouncing).
  if (!application.interviewResult) {
    if (application.status === "submitted" || application.status === "draft") {
      redirect(`/candidate/applications/${applicationId}/interview`);
    }
    // Phase 3.4 safety net: ResultPending's poll re-renders this component
    // every 2s, so firing here (detached — never blocks the render) re-triggers
    // advanced grading until the row lands. No-ops for basic-tier applications
    // and while a grade is already in flight (guards inside).
    if (application.status === "interview_completed") {
      void ensureAdvancedGraded(applicationId).catch((error) =>
        console.error("[advanced-grading] ensureAdvancedGraded failed:", error)
      );
    }
    return <ResultPending />;
  }

  const result = application.interviewResult;
  // Old mocked rows default result.passed=false but carry status "passed";
  // prefer the graded flag, fall back to status for backward compatibility.
  const passed = result.passed || application.status === "passed";

  // Rubric-scored result? (detected by data presence, not by date.) U4 REVERSES
  // the old no-numbers rule: the candidate now sees their score, tier and
  // recommendation. Per-criterion 1-5 values, evidence quotes and gate
  // mechanics stay business-only.
  const breakdown = parseRubricBreakdown(result.rubricScoresJson);
  const fitSummary = (result.fitSummary ?? "").trim();
  const strengths = parseEvidence(result.strengthsJson);
  // Concerns are intentionally NOT shown to the candidate (any row type);
  // business views still render them in full.

  // Rubric rows carry a 0-100 composite; pre-rubric rows only have the 0-1
  // score. Both render the same ring.
  const scorePercent =
    result.compositeScore != null
      ? Math.round(result.compositeScore)
      : scoreToPercent(result.score);
  // Label and colour both key off the VALUE, not the pass/fail outcome:
  // "Pass" means the employer passes ON the candidate, so it must read red even
  // though a borderline result can still carry it.
  const recommendationLabel = isRecommendation(result.recommendation)
    ? RECOMMENDATION_LABELS[result.recommendation]
    : "—";
  const recommendationClass = isRecommendation(result.recommendation)
    ? RECOMMENDATION_TEXT_CLASS[result.recommendation]
    : "text-brand-ink";

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-6 py-12 font-body lg:px-10">
      {/* Header */}
      <div className="mx-auto max-w-3xl space-y-5 text-center">
        <div className="space-y-2">
          <h1 className="text-page-title font-semibold text-brand-primary">
            Thank you for participating!
          </h1>
          <p className="text-body text-brand-ink-secondary">
            Your interview results are ready below. Review your performance
            summary and key feedback points to see how you did. Your result has
            been shared with the company.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Button
            asChild
            className="h-9 rounded-[8px] bg-brand-ink px-5 text-small font-medium text-white hover:bg-brand-ink/90"
          >
            <Link href="/candidate/jobs">Browse Other Jobs</Link>
          </Button>
          <Button
            asChild
            className="h-9 rounded-[8px] bg-brand-secondary px-5 text-small font-medium text-white hover:bg-brand-secondary/90"
          >
            <Link href="/candidate/applications">View My Applications</Link>
          </Button>
        </div>
      </div>

      {/* Outcome banner. KEPT deliberately: the role card below now shows the
          score / tier / recommendation, so this is no longer the only outcome
          cue — but it carries the encouraging copy the stats don't. Flagged for
          a product call rather than removed unilaterally. */}
      <div
        className={cn(
          "mx-auto max-w-3xl rounded-[12px] border px-6 py-5 text-center",
          passed
            ? "border-brand-border bg-status-success"
            : "border-brand-border bg-brand-surface"
        )}
      >
        <p
          className={cn(
            "text-meta font-semibold tracking-[1.2px] uppercase",
            passed ? "text-accent-3" : "text-brand-ink-secondary"
          )}
        >
          {passed ? "Passed" : "Needs review"}
        </p>
        <p className="mt-1 text-subheading font-semibold text-brand-ink">
          {passed ? "Congratulations, you passed!" : "Thanks for interviewing"}
        </p>
        <p className="mt-1 text-small text-brand-ink-secondary">
          {passed
            ? "Your interview met the bar for this role."
            : "You didn't meet the bar for this role this time — keep going, you can apply to other roles."}
        </p>
      </div>

      {/* Row 1 — role/score card + "How you came across". Pre-rubric rows have
          no category data, so the second card is omitted and the role card
          takes the full width rather than rendering an empty shell. */}
      <div
        className={cn(
          "grid gap-5",
          breakdown ? "lg:grid-cols-[483fr_702fr]" : "lg:grid-cols-1"
        )}
      >
        <ResultCard>
          <h2 className="text-heading font-semibold text-brand-primary">
            {application.job.title}
          </h2>
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8">
            <ScoreRing percent={scorePercent} passed={passed} />
            <div className="grid w-full min-w-0 gap-4 text-center sm:text-left">
              <StatRow label="Role Tier" value={TIER_LABELS[result.tier]} />
              <StatRow
                label="Recommendation"
                value={recommendationLabel}
                valueClassName={recommendationClass}
              />
              <StatRow
                label="Time Elapsed"
                value={formatDuration(result.durationSeconds)}
              />
            </div>
          </div>
        </ResultCard>

        {breakdown ? (
          <ResultCard title="How you came across:">
            <ImpressionGrid breakdown={breakdown} />
          </ResultCard>
        ) : null}
      </div>

      {/* Rows 2 + 3 — Fit Summary, then Strengths (concerns stay hidden). */}
      {RESULT_LOCKED ? (
        <LockedFeedbackPanel />
      ) : (
        <>
          {fitSummary ? (
            <ResultCard title="Fit Summary">
              <p className="text-body whitespace-pre-line text-brand-ink-secondary">
                {fitSummary}
              </p>
            </ResultCard>
          ) : null}
          {strengths.length > 0 ? (
            <ResultCard title="Strengths">
              <StrengthsList items={strengths} />
            </ResultCard>
          ) : null}
        </>
      )}

      {/* Transcript (kept from the previous page — collapsible, out of the way). */}
      <details className="mx-auto max-w-3xl rounded-[12px] border border-brand-border bg-brand-surface">
        <summary className="cursor-pointer list-none px-5 py-3 text-small font-medium text-brand-ink">
          View transcript
        </summary>
        <p className="border-t border-brand-border px-5 py-4 text-small whitespace-pre-line text-brand-ink-secondary">
          {result.transcript}
        </p>
      </details>
    </div>
  );
}
