import Link from "next/link";
import { redirect } from "next/navigation";
import type { Level, Prisma } from "@prisma/client";
import { Users } from "lucide-react";
import { getCurrentCompany } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { LEVELS } from "@/lib/jobs";
import { scoreToPercent, TIER_LABELS } from "@/lib/applications";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import {
  DateField,
  SearchField,
  SelectField,
} from "@/components/data-table/FilterFields";
import {
  ACTION_BTN,
  dayRangeFrom,
  firstParam as first,
  PAGE_SIZE,
  TableCard,
  TD_CLASS,
  TH_CLASS,
  TR_CLASS,
} from "@/components/data-table/TableCard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function BusinessDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const company = await getCurrentCompany();
  if (!company) redirect("/login");

  // ── URL-driven filters (same pattern as /candidate/jobs) ──────────────────
  const sp = await searchParams;
  const q = first(sp.q).trim();
  const dateStr = first(sp.date).trim();
  const levelParam = first(sp.level);
  const level = LEVELS.includes(levelParam as Level) ? (levelParam as Level) : null;
  const resultParam = first(sp.result);
  const result =
    resultParam === "passed" || resultParam === "failed" ? resultParam : null;
  const page = Math.max(1, Number.parseInt(first(sp.page), 10) || 1);

  // `date` = YYYY-MM-DD from the native date input → that calendar day (UTC).
  const dayRange = dayRangeFrom(dateStr);

  const companyJobs = { job: { companyId: company.id } };
  const where: Prisma.ApplicationWhereInput = {
    ...companyJobs,
    ...(q
      ? {
          candidateProfile: {
            OR: [
              { firstName: { contains: q, mode: "insensitive" } },
              { lastName: { contains: q, mode: "insensitive" } },
              { user: { email: { contains: q, mode: "insensitive" } } },
            ],
          },
        }
      : {}),
    ...(dayRange ? { createdAt: dayRange } : {}),
    ...(level ? { interviewResult: { tier: level } } : {}),
    ...(result ? { status: result } : {}),
  };

  const [totalJobs, totalApplicants, totalPassed, totalGraded, total, rows] =
    await Promise.all([
      prisma.job.count({ where: { companyId: company.id } }),
      prisma.application.count({ where: companyJobs }),
      prisma.application.count({ where: { ...companyJobs, status: "passed" } }),
      // Graded = has an interview result (awaiting interviews don't count).
      prisma.application.count({
        where: { ...companyJobs, interviewResult: { isNot: null } },
      }),
      prisma.application.count({ where }),
      prisma.application.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: {
          job: { select: { title: true } },
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
      }),
    ]);

  // Average Passing Rate = passed ÷ graded (applications with an
  // interviewResult), whole percent; "—" when nothing has been graded yet.
  const passingRate =
    totalGraded > 0 ? `${Math.round((totalPassed / totalGraded) * 100)}%` : "—";

  const needsCompanyProfile = !company.name.trim();
  const hasFilters = !!(q || dayRange || level || result);

  function pageHref(targetPage: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (dayRange) params.set("date", dateStr);
    if (level) params.set("level", level);
    if (result) params.set("result", result);
    if (targetPage > 1) params.set("page", String(targetPage));
    const query = params.toString();
    return `/business/dashboard${query ? `?${query}` : ""}`;
  }

  const stats = [
    { label: "Jobs Posted", value: String(totalJobs) },
    { label: "Total Candidates", value: String(totalApplicants) },
    { label: "Passed Candidates", value: String(totalPassed) },
    { label: "Average Passing Rate", value: passingRate },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-6 py-10 font-body lg:px-14 lg:py-14">
      <div className="space-y-2">
        <h1 className="text-page-title font-semibold text-brand-primary">
          Company Dashboard
        </h1>
        <p className="text-body text-brand-ink-secondary">
          Overview of jobs posted, total applicants, and recent system activity.
        </p>
      </div>

      {needsCompanyProfile ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-accent-4 bg-status-pending px-5 py-4 text-small text-brand-ink">
          <span>Complete your company profile to start posting jobs.</span>
          <Button
            asChild
            size="sm"
            className="rounded-[8px] bg-brand-secondary text-brand-canvas hover:bg-brand-secondary/90"
          >
            <Link href="/business/company">Complete profile</Link>
          </Button>
        </div>
      ) : null}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex min-h-[129px] flex-col items-center justify-center gap-2 rounded-[20px] border border-brand-border bg-brand-surface px-4 py-6 text-center"
          >
            <p className="font-display text-display font-bold text-brand-primary">
              {stat.value}
            </p>
            <p className="text-small text-brand-ink-secondary">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Applications */}
      <section className="space-y-5">
        <h2 className="text-heading font-semibold text-brand-primary">
          List of Applications
        </h2>

        <div className="flex flex-wrap gap-3">
          <SearchField param="q" placeholder="Search candidate name" />
          <DateField param="date" />
          <SelectField
            param="level"
            placeholder="Select level"
            clearLabel="All levels"
            options={LEVELS.map((l) => ({ value: l, label: TIER_LABELS[l] }))}
          />
          <SelectField
            param="result"
            placeholder="Filter result"
            clearLabel="All results"
            options={[
              { value: "passed", label: "Passed" },
              { value: "failed", label: "Failed" },
            ]}
          />
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon={Users}
            title={hasFilters ? "No matching applications" : "No applicants yet"}
            description={
              hasFilters
                ? "Try adjusting or clearing your filters."
                : "Applicants will show up here as soon as candidates apply to your jobs."
            }
            action={
              hasFilters ? (
                <Button
                  asChild
                  variant="outline"
                  className="rounded-[8px] border-brand-border font-body text-brand-ink"
                >
                  <Link href="/business/dashboard">Clear filters</Link>
                </Button>
              ) : (
                <Button
                  asChild
                  className="rounded-[8px] bg-brand-secondary font-body text-brand-canvas hover:bg-brand-secondary/90"
                >
                  <Link href="/business/jobs/new">Post a job</Link>
                </Button>
              )
            }
          />
        ) : (
          <TableCard
            page={page}
            total={total}
            noun={["application", "applications"]}
            pageHref={pageHref}
          >
            <Table>
              <TableHeader>
                <TableRow className="border-brand-border hover:bg-transparent">
                  {[
                    "Candidate Name",
                    "Application Date",
                    "Position",
                    "Level",
                    "Result",
                    "Actions",
                  ].map((h) => (
                    <TableHead key={h} className={TH_CLASS}>
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((app) => {
                  // Real candidate names — anonymization / unlock / seat
                  // credits are deferred monetization work, none of it exists.
                  const name =
                    [app.candidateProfile.firstName, app.candidateProfile.lastName]
                      .filter(Boolean)
                      .join(" ") || app.candidateProfile.user.email;
                  const r = app.interviewResult;
                  const resultText = r
                    ? `${scoreToPercent(r.score)}% (${
                        app.status === "passed"
                          ? "Passed"
                          : app.status === "failed"
                            ? "Failed"
                            : "Pending"
                      })`
                    : "—";
                  return (
                    <TableRow key={app.id} className={TR_CLASS}>
                      <TableCell className={cn(TD_CLASS, "font-medium text-brand-ink")}>
                        {name}
                      </TableCell>
                      <TableCell className={cn(TD_CLASS, "whitespace-nowrap")}>
                        {formatDate(app.createdAt)}
                      </TableCell>
                      <TableCell className={cn(TD_CLASS, "max-w-[220px] truncate")}>
                        {app.job?.title}
                      </TableCell>
                      <TableCell className={TD_CLASS}>
                        {r ? TIER_LABELS[r.tier] : "—"}
                      </TableCell>
                      <TableCell className={cn(TD_CLASS, "whitespace-nowrap")}>
                        {resultText}
                      </TableCell>
                      <TableCell className={TD_CLASS}>
                        <Button
                          asChild
                          size="sm"
                          className={cn(ACTION_BTN, "bg-brand-secondary hover:bg-brand-secondary/90")}
                        >
                          <Link
                            href={`/business/candidates/${app.candidateProfile.id}`}
                          >
                            View Profile
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

          </TableCard>
        )}
      </section>
    </div>
  );
}
