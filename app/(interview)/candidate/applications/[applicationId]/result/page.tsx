import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { parseEvidence, parseRubricBreakdown } from "@/lib/applications";
import { cn } from "@/lib/utils";
import { ensureAdvancedGraded } from "@/lib/elevenlabs/ensure-advanced-graded";
import { ResultPending } from "./ResultPending";
import {
  ImpressionList,
  LockedFeedbackPanel,
  ResultCard,
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
      job: { select: { title: true, company: { select: { name: true } } } },
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

  // Rubric-scored result? (detected by data presence, not by date.) The
  // candidate view of a rubric result is deliberately GENERALIZED: qualitative
  // per-category impressions only — no numeric scores, no 1-5 values, no
  // composite, no evidence quotes, no gate/must-have mechanics.
  const breakdown = parseRubricBreakdown(result.rubricScoresJson);
  const fitSummary = (result.fitSummary ?? "").trim();
  const strengths = parseEvidence(result.strengthsJson);
  // Concerns are intentionally NOT shown to the candidate (any row type);
  // business views still render them in full.
  const company = application.job.company.name;

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
            been shared with <span className="font-bold">{company}</span>.
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

      {/* Outcome banner — the candidate's only pass / needs-review cue (no
          tier / score / recommendation is shown). */}
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

      {/* Three cards */}
      <div className="grid gap-5 lg:grid-cols-3">
        <ResultCard>
          <div className="space-y-1">
            <h2 className="text-heading font-semibold text-brand-primary">
              {application.job.title}
            </h2>
            <p className="text-small text-brand-ink-secondary">{company}</p>
          </div>
          {/* Pre-rubric (old) rows have no category data → block omitted;
              they never show the old tier/score/recommendation row. */}
          {breakdown ? <ImpressionList breakdown={breakdown} /> : null}
        </ResultCard>

        {RESULT_LOCKED ? (
          <div className="lg:col-span-2">
            <LockedFeedbackPanel />
          </div>
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
      </div>

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
