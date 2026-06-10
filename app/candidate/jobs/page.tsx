import Link from "next/link";
import { Prisma, type Level, type WorkMode } from "@prisma/client";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { JobCard } from "@/components/jobs/JobCard";
import { LEVELS, WORK_MODES } from "@/lib/jobs";
import { JobFilters } from "./JobFilters";
import { JobSearch } from "./JobSearch";

const PAGE_SIZE = 10;

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

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const q = first(sp.q).trim();
  const modes = parseCsv(sp.mode).filter((m) =>
    WORK_MODES.includes(m as WorkMode)
  ) as WorkMode[];
  const levels = parseCsv(sp.level).filter((l) =>
    LEVELS.includes(l as Level)
  ) as Level[];
  const skillIds = parseCsv(sp.skill);
  const page = Math.max(1, Number.parseInt(first(sp.page), 10) || 1);

  const where: Prisma.JobWhereInput = {};
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }
  if (modes.length) where.workMode = { in: modes };
  if (levels.length) where.level = { in: levels };
  if (skillIds.length) where.skills = { some: { skillId: { in: skillIds } } };

  const [total, jobs, allSkills] = await Promise.all([
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
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function pageHref(targetPage: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (modes.length) params.set("mode", modes.join(","));
    if (levels.length) params.set("level", levels.join(","));
    if (skillIds.length) params.set("skill", skillIds.join(","));
    if (targetPage > 1) params.set("page", String(targetPage));
    const query = params.toString();
    return `/candidate/jobs${query ? `?${query}` : ""}`;
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="mb-6 text-2xl font-semibold">Browse jobs</h1>

      <div className="flex flex-col gap-8 sm:flex-row">
        <aside className="sm:w-60 sm:shrink-0">
          <JobFilters skills={allSkills} />
        </aside>

        <div className="min-w-0 flex-1 space-y-4">
          <JobSearch />

          <p className="text-muted-foreground text-sm">
            Showing {jobs.length} of {total} {total === 1 ? "job" : "jobs"}
          </p>

          {jobs.length === 0 ? (
            <p className="text-muted-foreground py-12 text-center text-sm">
              No jobs match your filters.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {jobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          )}

          {totalPages > 1 ? (
            <div className="flex items-center justify-between pt-2">
              {page > 1 ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={pageHref(page - 1)}>Previous</Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" disabled>
                  Previous
                </Button>
              )}
              <span className="text-muted-foreground text-sm">
                Page {page} of {totalPages}
              </span>
              {page < totalPages ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={pageHref(page + 1)}>Next</Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" disabled>
                  Next
                </Button>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
