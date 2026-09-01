import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { ArrowLeft, Pencil, Users } from "lucide-react";
import { getCurrentCompany } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { recommendationRank, scoreToPercent } from "@/lib/applications";
import {
  LEVEL_LABELS,
  WORK_MODE_LABELS,
  formatSalary,
  postedAgo,
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
import { AiRecommendButton } from "./AiRecommendButton";
import {
  DarkTag,
  SectionCard,
  SkillChip,
  TextSection,
} from "@/components/jobs/JobSections";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { JobStatusToggle } from "../JobStatusToggle";

const RESULT_OPTIONS = [
  { value: "passed", label: "Passed" },
  { value: "failed", label: "Failed" },
  // Preserves the old "In progress" tab (status submitted / draft).
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

export default async function JobApplicantsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const company = await getCurrentCompany();
  if (!company) redirect("/login");

  const job = await prisma.job.findFirst({
    where: { id, companyId: company.id },
    include: { company: true, skills: { include: { skill: true } } },
  });
  if (!job) notFound();
  const jobId = job.id;

  // ── URL-driven filters (same pattern as the dashboard) ────────────────────
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

  // One query for the job's (filtered) applicants — the set is small per job,
  // so we sort in JS (strongest recommendation, then score) and paginate the
  // sorted list; a DB skip/take can't express the recommendation ordering.
  const applications = await prisma.application.findMany({
    where,
    include: {
      candidateProfile: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          user: { select: { email: true } },
        },
      },
      interviewResult: {
        select: { score: true, tier: true, recommendation: true },
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
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (dayRange) params.set("date", dateStr);
    if (result) params.set("result", result);
    if (targetPage > 1) params.set("page", String(targetPage));
    const query = params.toString();
    return `/business/jobs/${jobId}${query ? `?${query}` : ""}`;
  }

  const salary = formatSalary(job.salaryMin, job.salaryMax);
  const HEADER_BTN =
    "h-[35px] rounded-[8px] px-5 font-body text-small font-medium text-white";

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-10 font-body lg:px-14 lg:py-14">
      <Link
        href="/business/jobs"
        className="inline-flex items-center gap-2 text-subheading font-semibold text-brand-primary hover:underline"
      >
        <ArrowLeft className="size-5" /> Back to Jobs
      </Link>

      {/* Top block */}
      <div className="flex flex-col gap-6 border-b border-brand-border pb-8 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="space-y-1">
            <h1 className="text-page-title font-semibold text-brand-primary">
              {job.title}
            </h1>
            <p className="text-body text-brand-ink-secondary">
              {job.company.name}
            </p>
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
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-start gap-2 md:items-end">
          <div className="flex flex-wrap gap-2">
            <Button
              asChild
              className={cn(
                HEADER_BTN,
                "min-w-[118px] bg-brand-secondary hover:bg-brand-secondary/90"
              )}
            >
              <Link href={`/business/jobs/${job.id}/edit`}>
                <Pencil /> Edit Job
              </Link>
            </Button>
            <JobStatusToggle
              jobId={job.id}
              jobTitle={job.title}
              companyName={job.company.name}
              status={job.status}
              variant="header"
            />
          </div>
          <p className="text-meta text-brand-ink-secondary">
            {postedAgo(job.createdAt)}
          </p>
        </div>
      </div>

      {/* Applicants */}
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
                : "Your job appears on the candidates' job board automatically — applicants will show up here once they apply."
            }
            action={
              hasFilters ? (
                <Button
                  asChild
                  variant="outline"
                  className="rounded-[8px] border-brand-border font-body text-brand-ink"
                >
                  <Link href={`/business/jobs/${job.id}`}>Clear filters</Link>
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
                  // Real candidate names — anonymization / unlock / seat
                  // credits are deferred monetization work, none of it exists.
                  const email = app.candidateProfile.user.email;
                  const name =
                    [app.candidateProfile.firstName, app.candidateProfile.lastName]
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
                      <TableCell className={cn(TD_CLASS, "font-medium text-brand-ink")}>
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
                            className={cn(ACTION_BTN, "bg-brand-secondary hover:bg-brand-secondary/90")}
                          >
                            <Link
                              href={`/business/candidates/${app.candidateProfile.id}?from=job:${job.id}`}
                            >
                              View Profile
                            </Link>
                          </Button>
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

      {/* Job content sections (same cards as the candidate job page) */}
      <div className="space-y-5">
        <TextSection title="Job Description" body={job.description} />
        <TextSection title="Role Overview" body={job.roleOverview} />
        <TextSection
          title="What does day-to-day look like"
          body={job.dayToDay}
          bullets
        />
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
            Applicants complete a short AI interview after applying. Their
            results are shared with {job.company.name} along with their full
            profile.
          </p>
        </SectionCard>
      </div>
    </div>
  );
}
