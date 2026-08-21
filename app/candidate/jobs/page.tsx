import Link from "next/link";
import { SearchX } from "lucide-react";
import { Prisma, type Level, type WorkMode } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getInterviewSeatBalance } from "@/lib/interview-seats";
import { JobCard } from "@/components/jobs/JobCard";
import { EmptyState } from "@/components/EmptyState";
import { LEVELS, WORK_MODES } from "@/lib/jobs";
import { cn } from "@/lib/utils";
import { JobFilters } from "./JobFilters";

// 9 fills the 3-column grid evenly.
const PAGE_SIZE = 9;

function parseCsv(value: string | string[] | undefined): string[] {
  if (!value) return [];
  const raw = Array.isArray(value) ? value.join(",") : value;
  return raw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

// Page numbers to render: always 1 and last, a window of ±1 around the
// current page, and "…" for any gap. e.g. 1 … 4 5 6 … 12
function pageItems(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const keep = new Set([1, total, current - 1, current, current + 1]);
  const items: (number | "…")[] = [];
  for (let p = 1; p <= total; p++) {
    if (keep.has(p)) items.push(p);
    else if (items[items.length - 1] !== "…") items.push("…");
  }
  return items;
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const q = first(sp.q).trim();
  const location = first(sp.location).trim();
  const modes = parseCsv(sp.mode).filter((m) =>
    WORK_MODES.includes(m as WorkMode)
  ) as WorkMode[];
  const levels = parseCsv(sp.level).filter((l) =>
    LEVELS.includes(l as Level)
  ) as Level[];
  const skillIds = parseCsv(sp.skill);
  const page = Math.max(1, Number.parseInt(first(sp.page), 10) || 1);
  const hasFilters =
    !!q || !!location || modes.length > 0 || levels.length > 0 || skillIds.length > 0;

  const where: Prisma.JobWhereInput = {};
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }
  if (location) where.location = { contains: location, mode: "insensitive" };
  if (modes.length) where.workMode = { in: modes };
  if (levels.length) where.level = { in: levels };
  if (skillIds.length) where.skills = { some: { skillId: { in: skillIds } } };

  const user = await getCurrentUser();

  const [total, jobs, allSkills, applications, seatBalance] = await Promise.all([
    prisma.job.count({ where }),
    prisma.job.findMany({
      where,
      include: { company: true, skills: { include: { skill: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.skill.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    // One query for every job this candidate has applied to (drives the
    // card's disabled "Apply Now" + "Applied" state). No per-card lookups.
    user
      ? prisma.application.findMany({
          where: { candidateProfile: { userId: user.id } },
          select: { jobId: true },
        })
      : Promise.resolve([]),
    user
      ? prisma.candidateProfile
          .findUnique({ where: { userId: user.id }, select: { id: true } })
          .then((p) => (p ? getInterviewSeatBalance(prisma, p.id) : null))
      : Promise.resolve(null),
  ]);
  const appliedJobIds = new Set(applications.map((a) => a.jobId));
  const noSeats = seatBalance != null && seatBalance.remaining === 0;

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function pageHref(targetPage: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (location) params.set("location", location);
    if (modes.length) params.set("mode", modes.join(","));
    if (levels.length) params.set("level", levels.join(","));
    if (skillIds.length) params.set("skill", skillIds.join(","));
    if (targetPage > 1) params.set("page", String(targetPage));
    const query = params.toString();
    return `/candidate/jobs${query ? `?${query}` : ""}`;
  }

  const pageBtn =
    "inline-flex h-[39px] min-w-[35px] items-center justify-center rounded-[8px] border px-2 text-small transition-colors";
  const pageBtnIdle =
    "border-brand-border bg-brand-surface text-brand-ink-secondary hover:bg-brand-container";
  const pageBtnActive = "border-brand-secondary bg-brand-secondary text-white";

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-10 font-body lg:px-14 lg:py-14">
      <div className="space-y-2 border-b border-brand-border pb-6">
        <h1 className="text-page-title font-semibold text-brand-primary">
          Browse Jobs
        </h1>
        <p className="max-w-2xl text-body text-brand-ink-secondary">
          Our AI has curated these opportunities based on your unique profile
          and aspirations. Find where you belong.
        </p>
      </div>

      <JobFilters skills={allSkills} />

      {jobs.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title={hasFilters ? "No jobs match your filters" : "No jobs posted yet"}
          description={
            hasFilters
              ? "Try removing a filter or searching for something else."
              : "Check back soon — new roles are added regularly."
          }
          className="border-brand-border bg-brand-surface"
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              applied={appliedJobIds.has(job.id)}
              noSeats={noSeats}
            />
          ))}
        </div>
      )}

      <p className="text-meta text-brand-ink-secondary">
        Showing {jobs.length} of {total} {total === 1 ? "job" : "jobs"}
      </p>

      {totalPages > 1 ? (
        <nav
          aria-label="Pagination"
          className="flex flex-wrap items-center justify-center gap-2"
        >
          {page > 1 ? (
            <Link
              href={pageHref(page - 1)}
              className={cn(pageBtn, pageBtnIdle, "min-w-[71px]")}
            >
              Prev
            </Link>
          ) : null}
          {pageItems(page, totalPages).map((item, i) =>
            item === "…" ? (
              <span
                key={`gap-${i}`}
                className="px-1 text-small text-brand-ink-secondary"
              >
                …
              </span>
            ) : item === page ? (
              <span
                key={item}
                aria-current="page"
                className={cn(pageBtn, pageBtnActive)}
              >
                {item}
              </span>
            ) : (
              <Link
                key={item}
                href={pageHref(item)}
                className={cn(pageBtn, pageBtnIdle)}
              >
                {item}
              </Link>
            )
          )}
          {page < totalPages ? (
            <Link
              href={pageHref(page + 1)}
              className={cn(pageBtn, pageBtnIdle, "min-w-[71px]")}
            >
              Next
            </Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}
