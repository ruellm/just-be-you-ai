import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RecommendationBadge, TierBadge } from "@/components/applications/Badges";
import { FitEvaluation } from "@/components/applications/FitEvaluation";
import { scoreToPercent } from "@/lib/applications";
import { ResultPending } from "./ResultPending";

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
  if (!profile) redirect("/candidate/profile/basic-info");

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
    return <ResultPending />;
  }

  const result = application.interviewResult;
  // Old mocked rows default result.passed=false but carry status "passed";
  // prefer the graded flag, fall back to status for backward compatibility.
  const passed = result.passed || application.status === "passed";

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-6 py-10">
      {/* Pass / needs-review banner */}
      <div
        className={
          passed
            ? "rounded-lg border border-green-200 bg-green-50 p-5 text-center dark:border-green-900 dark:bg-green-950"
            : "rounded-lg border bg-muted/50 p-5 text-center"
        }
      >
        <p className="text-xs font-semibold tracking-wide uppercase">
          {passed ? "Passed" : "Needs review"}
        </p>
        <h1 className="mt-1 text-xl font-semibold">
          {passed
            ? "Congratulations, you passed!"
            : "Thanks for interviewing"}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {passed
            ? "Your interview met the bar for this role."
            : "You didn't meet the bar for this role this time — keep going, you can apply to other roles."}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {application.job.title} · {application.job.company.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <p className="text-muted-foreground text-sm">Tier</p>
              <TierBadge
                tier={result.tier}
                className="mt-1 px-3 py-1 text-base"
              />
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Score</p>
              <p className="mt-1 text-2xl font-semibold">
                {scoreToPercent(result.score)}%
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Recommendation</p>
              <RecommendationBadge
                recommendation={result.recommendation}
                className="mt-1 px-3 py-1 text-base"
              />
            </div>
          </div>

          <FitEvaluation
            fitSummary={result.fitSummary}
            strengthsJson={result.strengthsJson}
            concernsJson={result.concernsJson}
          />

          <p className="text-muted-foreground text-sm">
            Your result has been shared with {application.job.company.name}.
          </p>

          <details className="group rounded-md border">
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium">
              View transcript
            </summary>
            <p className="text-muted-foreground border-t px-4 py-3 text-sm whitespace-pre-line">
              {result.transcript}
            </p>
          </details>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link href="/candidate/jobs">Browse more jobs</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/candidate/applications">View my applications</Link>
        </Button>
      </div>
    </div>
  );
}
