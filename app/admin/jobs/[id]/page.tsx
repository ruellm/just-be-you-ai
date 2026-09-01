import Link from "next/link";
import { notFound } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { ArrowLeft, Users } from "lucide-react";
import { prisma } from "@/lib/db";
import { formatLongDate } from "@/lib/dates";
import { recommendationRank, scoreToPercent } from "@/lib/applications";
import {
  formatSalary,
  LEVEL_LABELS,
  postedAgo,
  WORK_MODE_LABELS,
} from "@/lib/jobs";
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
import {
  DarkTag,
  SectionCard,
  SkillChip,
  TextSection,
} from "@/components/jobs/JobSections";
// Same toast-only button B7a built for the business job page — imported rather
// than duplicated so the two cannot drift. That file is not modified.
import { AiRecommendButton } from "@/app/business/jobs/[id]/AiRecommendButton";
import { DeleteApplicationButton } from "./DeleteApplicationButton";
import { JobHeaderActions } from "./JobHeaderActions";

const RESULT_OPTIONS = [
  { value: "passed", label: "Passed" },
  { value: "failed", label: "Failed" },
  { value: "in-progress", label: "In progress" },
] as const;

type ResultFilter = (typeof RESULT_OPTIONS)[number]["value"];

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function AdminJobDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;

  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      company: { select: { id: true, name: true } },
      skills: { include: { skill: { select: { name: true } } } },
      _count: { select: { applications: true } },
    },
  });
  if (!job) notFound();
  // Hoisted so the pageHref closure below keeps the non-null narrowing.
  const jobId = job.id;

  // ── URL-driven filters (same pattern as the business applicants list) ─────
  const sp = await searchParams;
  const q = first(sp.q).trim();
  const dateStr = first(sp.date).trim();
  const dayRange = dayRangeFrom(dateStr);
  const resultParam = first(sp.result);
  const result = RESULT_OPTIONS.some((o) => o.value === resultParam)
    ? (resultParam as ResultFilter)
    : null;
  const page = Math.max(1, Number.parseInt(first(sp.page), 10) || 1);

  const where: Prisma.ApplicationWhereInput = {
    jobId: job.id,
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
    ...(result === "passed" ? { status: "passed" } : {}),
    ...(result === "failed" ? { status: "failed" } : {}),
    ...(result === "in-progress"
      ? { status: { in: ["submitted", "draft"] } }
      : {}),
  };

  // ONE query for the job's filtered applicants, with the candidate and the
  // interview result joined in. Sorting is done in JS (strongest recommendation
  // then score) because a DB skip/take cannot express that ordering — the set
  // is small per job. No per-row lookups anywhere below.
  const applications = await prisma.application.findMany({
    where,
    include: {
      candidateProfile: {
        select: {
          id: true,
          userId: true,
          firstName: true,
          lastName: true,
          user: { select: { email: true } },
        },
      },
      interviewResult: {
        select: { score: true, recommendation: true },
      },
    },
  });
  applications.sort((a, b) => {
    const rankDiff =
      recommendationRank(b.interviewResult?.recommendation) -
      recommendationRank(a.interviewResult?.recommendation);
    if (rankDiff !== 0) return rankDiff;
    return (b.interviewResult?.score ?? -1) - (a.interviewResult?.score ?? -1);
  });
  const total = applications.length;
  const rows = applications.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasFilters = !!(q || dayRange || result);

  function pageHref(targetPage: number) {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (dayRange) p.set("date", dateStr);
    if (result) p.set("result", result);
    if (targetPage > 1) p.set("page", String(targetPage));
    const query = p.toString();
    return `/admin/jobs/${jobId}${query ? `?${query}` : ""}`;
  }

  const salary = formatSalary(job.salaryMin, job.salaryMax);
  const companyName = job.company.name || "(unnamed company)";

  return (
    <div className="space-y-6 px-6 py-8 font-body lg:px-14">
      <Link
        href={`/admin/companies/${job.company.id}`}
        className="inline-flex items-center gap-2 text-subheading font-semibold tracking-[-0.5px] text-brand-primary hover:underline"
      >
        <ArrowLeft className="size-5" /> Back to Previous
      </Link>

      <div className="flex flex-col gap-6 border-b border-brand-border pb-6 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="space-y-1">
            <h1 className="text-section font-semibold tracking-[-0.5px] text-brand-primary">
              {job.title}
            </h1>
            <p className="text-body text-brand-ink-secondary">{companyName}</p>
          </div>
          {salary ? (
            <p className="text-body font-semibold text-brand-ink-secondary">
              {salary}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <DarkTag>{WORK_MODE_LABELS[job.workMode]}</DarkTag>
            {job.location ? <DarkTag>{job.location}</DarkTag> : null}
            <DarkTag>{LEVEL_LABELS[job.level]}</DarkTag>
            {job.status === "closed" ? <DarkTag>Closed</DarkTag> : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-start gap-3 md:items-end">
          <JobHeaderActions
            jobId={job.id}
            title={job.title}
            companyName={companyName}
            status={job.status}
            applicationCount={job._count.applications}
          />
          <p className="text-meta text-brand-ink-secondary">
            {postedAgo(job.createdAt)}
            <span className="mx-1.5">•</span>
            {formatLongDate(job.createdAt)}
            <span className="mx-1.5">•</span>
            {job._count.applications}{" "}
            {job._count.applications === 1 ? "applicant" : "applicants"}
          </p>
        </div>
      </div>

      {/* ── List of Applicants ─────────────────────────────────────────── */}
      <section className="space-y-5">
        <h2 className="text-heading font-semibold text-brand-primary">
          List of Applicants
        </h2>

        <div className="flex flex-wrap gap-3">
          <SearchField param="q" placeholder="Search candidate name" />
          <DateField param="date" />
          <SelectField
            param="result"
            placeholder="Filter result"
            clearLabel="All results"
            options={[...RESULT_OPTIONS]}
          />
          <AiRecommendButton />
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon={Users}
            title={hasFilters ? "No matching applicants" : "No applicants yet"}
            description={
              hasFilters
                ? "Try adjusting or clearing your filters."
                : "Applicants appear here once candidates apply to this job."
            }
            action={
              hasFilters ? (
                <Button
                  asChild
                  variant="outline"
                  className="rounded-[8px] border-brand-border font-body text-brand-ink"
                >
                  <Link href={`/admin/jobs/${job.id}`}>Clear filters</Link>
                </Button>
              ) : undefined
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
                    "Interview Result",
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
                  const email = app.candidateProfile.user.email;
                  const name =
                    [
                      app.candidateProfile.firstName,
                      app.candidateProfile.lastName,
                    ]
                      .filter(Boolean)
                      .join(" ") || email;
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
                      <TableCell
                        className={cn(TD_CLASS, "font-medium text-brand-ink")}
                      >
                        {name}
                      </TableCell>
                      <TableCell className={cn(TD_CLASS, "whitespace-nowrap")}>
                        {formatDate(app.createdAt)}
                      </TableCell>
                      <TableCell className={cn(TD_CLASS, "whitespace-nowrap")}>
                        {resultText}
                      </TableCell>
                      <TableCell className={TD_CLASS}>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            asChild
                            size="sm"
                            className={cn(
                              ACTION_BTN,
                              "bg-brand-secondary hover:bg-brand-secondary/90"
                            )}
                          >
                            <Link
                              href={`/admin/users/${app.candidateProfile.userId}`}
                            >
                              View Profile
                            </Link>
                          </Button>
                          <DeleteApplicationButton candidateName={name} />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableCard>
        )}
      </section>

      <div className="space-y-6">
        <TextSection title="Job Description" body={job.description} />
        <TextSection title="Role Overview" body={job.roleOverview} />
        <TextSection title="What does day-to-day look like" body={job.dayToDay} />
        <TextSection title="Requirements" body={job.requirements} bullets />

        {job.skills.length > 0 ? (
          <SectionCard title="Required Skills">
            <div className="flex flex-wrap gap-2">
              {job.skills.map((s) => (
                <SkillChip key={s.skillId}>{s.skill.name}</SkillChip>
              ))}
            </div>
          </SectionCard>
        ) : null}

        <SectionCard title="Evaluation Process" tone="container">
          <p className="text-body text-brand-ink">
            After candidates apply, they complete a short AI interview. Results
            are shared with {companyName} along with their profile.
          </p>
        </SectionCard>
      </div>
    </div>
  );
}
