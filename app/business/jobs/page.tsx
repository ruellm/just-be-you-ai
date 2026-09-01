import Link from "next/link";
import { redirect } from "next/navigation";
import type { Level, Prisma, WorkMode } from "@prisma/client";
import { Briefcase, Plus } from "lucide-react";
import { getCurrentCompany } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { LEVELS, LEVEL_LABELS, WORK_MODES, WORK_MODE_LABELS } from "@/lib/jobs";
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
import { JobStatusToggle } from "./JobStatusToggle";

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function BusinessJobsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const company = await getCurrentCompany();
  if (!company) redirect("/login");

  // ── URL-driven filters (same pattern as the dashboard) ────────────────────
  const sp = await searchParams;
  const q = first(sp.q).trim();
  const dateStr = first(sp.date).trim();
  const dayRange = dayRangeFrom(dateStr);
  const levelParam = first(sp.level);
  const level = LEVELS.includes(levelParam as Level) ? (levelParam as Level) : null;
  const modeParam = first(sp.mode);
  const mode = WORK_MODES.includes(modeParam as WorkMode)
    ? (modeParam as WorkMode)
    : null;
  const statusParam = first(sp.status);
  const status =
    statusParam === "open" || statusParam === "closed" ? statusParam : null;
  const page = Math.max(1, Number.parseInt(first(sp.page), 10) || 1);

  const where: Prisma.JobWhereInput = {
    companyId: company.id,
    ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
    ...(dayRange ? { createdAt: dayRange } : {}),
    ...(level ? { level } : {}),
    ...(mode ? { workMode: mode } : {}),
    ...(status ? { status } : {}),
  };

  const [total, jobs] = await Promise.all([
    prisma.job.count({ where }),
    prisma.job.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        title: true,
        createdAt: true,
        level: true,
        workMode: true,
        status: true,
      },
    }),
  ]);

  const hasFilters = !!(q || dayRange || level || mode || status);

  function pageHref(targetPage: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (dayRange) params.set("date", dateStr);
    if (level) params.set("level", level);
    if (mode) params.set("mode", mode);
    if (status) params.set("status", status);
    if (targetPage > 1) params.set("page", String(targetPage));
    const query = params.toString();
    return `/business/jobs${query ? `?${query}` : ""}`;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-10 font-body lg:px-14 lg:py-14">
      <div className="flex flex-col gap-4 border-b border-brand-border pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-page-title font-semibold text-brand-primary">
            Job Postings
          </h1>
          <p className="text-body text-brand-ink-secondary">
            Manage active listings, track candidate applications, and publish
            new job opportunities.
          </p>
        </div>
        <Button
          asChild
          className="h-[35px] shrink-0 rounded-[8px] bg-brand-secondary px-4 text-small font-semibold text-white hover:bg-brand-secondary/90"
        >
          <Link href="/business/jobs/new">
            <Plus /> Post a New Job
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <SearchField param="q" placeholder="Search job title" />
        <DateField param="date" />
        <SelectField
          param="level"
          placeholder="Select level"
          clearLabel="All levels"
          options={LEVELS.map((l) => ({ value: l, label: LEVEL_LABELS[l] }))}
        />
        <SelectField
          param="mode"
          placeholder="Filter by mode"
          clearLabel="All modes"
          options={WORK_MODES.map((m) => ({
            value: m,
            label: WORK_MODE_LABELS[m],
          }))}
        />
        <SelectField
          param="status"
          placeholder="Filter by status"
          clearLabel="All statuses"
          options={[
            { value: "open", label: "Open" },
            { value: "closed", label: "Closed" },
          ]}
        />
      </div>

      {jobs.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title={
            hasFilters ? "No matching jobs" : "You haven't posted any jobs yet"
          }
          description={
            hasFilters
              ? "Try adjusting or clearing your filters."
              : "Post your first role to start receiving applicants."
          }
          action={
            hasFilters ? (
              <Button
                asChild
                variant="outline"
                className="rounded-[8px] border-brand-border font-body text-brand-ink"
              >
                <Link href="/business/jobs">Clear filters</Link>
              </Button>
            ) : (
              <Button
                asChild
                className="rounded-[8px] bg-brand-secondary font-body text-white hover:bg-brand-secondary/90"
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
          noun={["job", "jobs"]}
          pageHref={pageHref}
        >
          <Table>
            <TableHeader>
              <TableRow className="border-brand-border hover:bg-transparent">
                {["Job Title", "Date Posted", "Level", "Mode", "Status", "Actions"].map(
                  (h) => (
                    <TableHead key={h} className={TH_CLASS}>
                      {h}
                    </TableHead>
                  )
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => (
                <TableRow key={job.id} className={TR_CLASS}>
                  <TableCell
                    className={cn(TD_CLASS, "max-w-[280px] text-small font-medium text-brand-ink")}
                  >
                    <Link
                      href={`/business/jobs/${job.id}`}
                      className="block truncate hover:underline"
                    >
                      {job.title}
                    </Link>
                  </TableCell>
                  <TableCell className={cn(TD_CLASS, "whitespace-nowrap")}>
                    {formatDate(job.createdAt)}
                  </TableCell>
                  <TableCell className={TD_CLASS}>
                    {LEVEL_LABELS[job.level]}
                  </TableCell>
                  <TableCell className={TD_CLASS}>
                    {WORK_MODE_LABELS[job.workMode]}
                  </TableCell>
                  <TableCell className={TD_CLASS}>
                    {job.status === "open" ? "Open" : "Closed"}
                  </TableCell>
                  <TableCell className={TD_CLASS}>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        asChild
                        size="sm"
                        className={cn(ACTION_BTN, "bg-brand-secondary hover:bg-brand-secondary/90")}
                      >
                        <Link href={`/business/jobs/${job.id}`}>View</Link>
                      </Button>
                      <Button
                        asChild
                        size="sm"
                        className={cn(ACTION_BTN, "bg-brand-ink hover:bg-brand-ink/90")}
                      >
                        <Link href={`/business/jobs/${job.id}/edit`}>Edit</Link>
                      </Button>
                      <JobStatusToggle
                        jobId={job.id}
                        jobTitle={job.title}
                        companyName={company.name}
                        status={job.status}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableCard>
      )}
    </div>
  );
}
