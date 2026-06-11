import Link from "next/link";
import { Inbox } from "lucide-react";
import type { ApplicationStatus } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge, TierBadge } from "@/components/applications/Badges";
import { EmptyState } from "@/components/EmptyState";
import { applicationPath } from "@/lib/applications";
import { cn } from "@/lib/utils";

const FILTERS: { key: string; label: string; status: ApplicationStatus | null }[] =
  [
    { key: "all", label: "All", status: null },
    { key: "submitted", label: "Submitted", status: "submitted" },
    { key: "completed", label: "Completed", status: "interview_completed" },
    { key: "passed", label: "Passed", status: "passed" },
    { key: "failed", label: "Failed", status: "failed" },
  ];

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

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
        select: { id: true },
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
          job: { select: { title: true, company: { select: { name: true } } } },
          interviewResult: { select: { tier: true } },
        },
      })
    : [];

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      <h1 className="text-2xl font-semibold">My applications</h1>

      {/* Status filter */}
      <div className="flex flex-wrap gap-1">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.status ? `/candidate/applications?status=${f.key}` : "/candidate/applications"}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active.key === f.key
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
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
            <Button asChild>
              <Link href="/candidate/jobs">Browse jobs</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3">
          {applications.map((app) => (
            <Link
              key={app.id}
              href={applicationPath(app.id, app.status)}
              className="block"
            >
              <Card className="transition-colors hover:border-foreground/20">
                <CardContent className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{app.job.title}</p>
                    <p className="text-muted-foreground text-sm">
                      {app.job.company.name} · Applied {formatDate(app.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {app.interviewResult ? (
                      <TierBadge tier={app.interviewResult.tier} />
                    ) : null}
                    <StatusBadge status={app.status} />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
