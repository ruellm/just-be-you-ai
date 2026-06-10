import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { getCurrentCompany } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge, TierBadge } from "@/components/applications/Badges";
import { scoreToPercent } from "@/lib/applications";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "all", label: "All applicants" },
  { key: "passed", label: "Passed" },
  { key: "failed", label: "Failed" },
  { key: "in-progress", label: "In progress" },
];

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function JobApplicantsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const activeTab = TABS.find((t) => t.key === tab) ?? TABS[0];

  const company = await getCurrentCompany();
  if (!company) redirect("/login");

  const job = await prisma.job.findFirst({
    where: { id, companyId: company.id },
    select: { id: true, title: true, status: true },
  });
  if (!job) notFound();

  const applications = await prisma.application.findMany({
    where: { jobId: job.id },
    include: {
      candidateProfile: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          user: { select: { email: true } },
        },
      },
      interviewResult: { select: { score: true, tier: true } },
    },
  });

  // Best candidates first (no result sorts last).
  applications.sort(
    (a, b) =>
      (b.interviewResult?.score ?? -1) - (a.interviewResult?.score ?? -1)
  );

  const filtered = applications.filter((a) => {
    if (activeTab.key === "passed") return a.status === "passed";
    if (activeTab.key === "failed") return a.status === "failed";
    if (activeTab.key === "in-progress")
      return a.status === "submitted" || a.status === "draft";
    return true;
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      <Link
        href="/business/jobs"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="size-4" /> Back to jobs
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{job.title}</h1>
          <p className="text-muted-foreground text-sm">
            {applications.length}{" "}
            {applications.length === 1 ? "applicant" : "applicants"} ·{" "}
            {job.status === "open" ? "Open" : "Closed"}
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/business/jobs/${job.id}/edit`}>
            <Pencil /> Edit job
          </Link>
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b pb-2">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={
              t.key === "all"
                ? `/business/jobs/${job.id}`
                : `/business/jobs/${job.id}?tab=${t.key}`
            }
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              activeTab.key === t.key
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground py-12 text-center text-sm">
          No applicants in this category yet.
        </p>
      ) : (
        <div className="grid gap-3">
          {filtered.map((app) => {
            const name =
              [app.candidateProfile.firstName, app.candidateProfile.lastName]
                .filter(Boolean)
                .join(" ") || app.candidateProfile.user.email;
            return (
              <Card key={app.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="font-medium">{name}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      {app.interviewResult ? (
                        <>
                          <TierBadge tier={app.interviewResult.tier} />
                          <span className="text-muted-foreground text-sm">
                            {scoreToPercent(app.interviewResult.score)}%
                          </span>
                        </>
                      ) : null}
                      <StatusBadge status={app.status} />
                    </div>
                    <p className="text-muted-foreground text-xs">
                      Applied {formatDate(app.createdAt)}
                    </p>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link
                      href={`/business/candidates/${app.candidateProfile.id}?from=job:${job.id}`}
                    >
                      View profile
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
