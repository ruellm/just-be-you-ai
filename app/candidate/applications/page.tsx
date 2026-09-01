import Link from "next/link";
import { ExternalLink, FileCheck, FileText, Inbox } from "lucide-react";
import type { ApplicationStatus } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/applications/Badges";
import { EmptyState } from "@/components/EmptyState";
import { applicationPath } from "@/lib/applications";
import {
  canSeeHiringCompany,
  hasPassedApplication,
  hiringCompanyName,
} from "@/lib/company-visibility";
import { cn } from "@/lib/utils";

const FILTERS: { key: string; label: string; status: ApplicationStatus | null }[] =
  [
    { key: "all", label: "All", status: null },
    { key: "submitted", label: "Ongoing", status: "submitted" },
    { key: "completed", label: "Completed", status: "interview_completed" },
    { key: "passed", label: "Passed", status: "passed" },
    { key: "failed", label: "Failed", status: "failed" },
  ];

// Applications that can still be interviewed (mirrors applicationPath():
// these route to /interview, everything else routes to /result).
function isInterviewable(status: ApplicationStatus): boolean {
  return status === "draft" || status === "submitted";
}

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const ACTION_BTN =
  "h-[35px] rounded-[8px] px-3 font-body text-small font-medium text-white";

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const active = FILTERS.find((f) => f.key === status) ?? FILTERS[0];

  const user = await getCurrentUser();
  const profile = user
    ? await prisma.candidateProfile.findUnique({
        where: { userId: user.id },
        select: { id: true, tier: true },
      })
    : null;

  const applications = profile
    ? await prisma.application.findMany({
        where: {
          candidateProfileId: profile.id,
          ...(active.status ? { status: active.status } : {}),
        },
        orderBy: { createdAt: "desc" },
        include: {
          // company.name ONLY, and stripped below unless the reveal gate is
          // open — never the full Company row.
          job: { select: { title: true, company: { select: { name: true } } } },
          // `passed` rides on the relation this page already selects.
          interviewResult: { select: { tier: true, passed: true } },
        },
      })
    : [];

  // One pass over the rows already fetched — no per-row query. `company` is
  // destructured off so the withheld name never reaches the RSC payload.
  const rows = applications.map(({ job: { company, ...job }, ...app }) => ({
    app,
    job,
    companyName: hiringCompanyName(
      company.name,
      canSeeHiringCompany({
        tier: profile?.tier ?? null,
        passedThisJob: hasPassedApplication(app),
      })
    ),
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-10 font-body lg:px-14 lg:py-14">
      <div className="space-y-2 border-b border-brand-border pb-6">
        <h1 className="text-page-title font-semibold text-brand-primary">
          My Applications
        </h1>
        <p className="max-w-2xl text-body text-brand-ink-secondary">
          Keep track of your journey. Manage your submissions, interview
          stages, and feedback in one place.
        </p>
      </div>

      {/* Status filter pills (server-rendered links on ?status=) */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={
              f.status
                ? `/candidate/applications?status=${f.key}`
                : "/candidate/applications"
            }
            aria-current={active.key === f.key ? "page" : undefined}
            className={cn(
              "inline-flex h-[39px] items-center rounded-[8px] border px-4 text-small font-medium transition-colors",
              active.key === f.key
                ? "border-brand-secondary bg-brand-secondary text-white"
                : "border-brand-border bg-brand-surface text-brand-ink-secondary hover:bg-brand-container"
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {applications.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={
            active.status
              ? "No applications with this status"
              : "No applications yet"
          }
          description={
            active.status
              ? "Try a different filter, or browse jobs to apply."
              : "Browse open roles and apply to get started."
          }
          action={
            <Button
              asChild
              className="h-[46px] min-w-[174px] rounded-[12px] bg-brand-secondary px-6 text-small font-medium text-white hover:bg-brand-secondary/90"
            >
              <Link href="/candidate/jobs">Browse Jobs</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4">
          {rows.map(({ app, job, companyName }) => {
            const interviewable = isInterviewable(app.status);
            return (
              <article
                key={app.id}
                className="flex flex-col gap-4 rounded-[12px] border border-brand-border bg-brand-surface px-6 py-6 md:flex-row md:items-center md:justify-between"
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-subheading font-semibold text-brand-primary">
                      {job.title}
                    </h2>
                    <StatusBadge status={app.status} />
                  </div>
                  <p className="flex flex-wrap items-center gap-2 text-small text-brand-ink-secondary">
                    <span>{companyName}</span>
                    <span
                      aria-hidden
                      className="size-1 rounded-full bg-brand-ink-secondary"
                    />
                    <span>Applied {formatDate(app.createdAt)}</span>
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 md:shrink-0">
                  <Button
                    asChild
                    className={cn(ACTION_BTN, "bg-brand-ink hover:bg-brand-ink/90")}
                  >
                    <Link href={`/candidate/jobs/${app.jobId}`}>
                      <ExternalLink /> View Role
                    </Link>
                  </Button>
                  {/* Continue Interview / View Result both resolve through
                      applicationPath() — the single source of routing truth. */}
                  <Button
                    asChild
                    className={cn(
                      ACTION_BTN,
                      "bg-brand-secondary hover:bg-brand-secondary/90"
                    )}
                  >
                    <Link href={applicationPath(app.id, app.status)}>
                      {interviewable ? (
                        <>
                          <FileText /> Continue Interview
                        </>
                      ) : (
                        <>
                          <FileCheck /> View Result
                        </>
                      )}
                    </Link>
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
