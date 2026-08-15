import Link from "next/link";
import type { ReactNode } from "react";
import type { Prisma } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  LEVEL_LABELS,
  WORK_MODE_LABELS,
  formatSalary,
  postedAgo,
} from "@/lib/jobs";
import { JobCardApplyButton } from "./JobCardApplyButton";

export type JobCardData = Prisma.JobGetPayload<{
  include: { company: true; skills: { include: { skill: true } } };
}>;

// Redesigned job card (brand tokens). Reused by the dashboard's
// "Recommended For You" grid and (next session) the Find Jobs list, so the
// action row is configurable:
//   - `applied`  → Apply Now is disabled and the footer shows "Applied"
//   - closed jobs → Apply Now disabled, footer shows "Closed"
//   - `actions`  → replaces the default View Role / Apply Now pair entirely
//   - `actions={null}` → no action row at all
export function JobCard({
  job,
  applied = false,
  actions,
  className,
}: {
  job: JobCardData;
  applied?: boolean;
  actions?: ReactNode | null;
  className?: string;
}) {
  const salary = formatSalary(job.salaryMin, job.salaryMax);
  const skills = job.skills.map((s) => s.skill.name);
  const shownSkills = skills.slice(0, 3);
  const extraSkills = skills.length - shownSkills.length;
  const closed = job.status === "closed";
  const state = applied ? "Applied" : closed ? "Closed" : null;

  return (
    <article
      className={cn(
        "flex flex-col gap-4 rounded-[12px] border border-brand-border bg-brand-surface p-5 font-body",
        className
      )}
    >
      <div className="min-w-0 space-y-1">
        <h3 className="truncate text-xl font-semibold text-brand-primary">
          <Link href={`/candidate/jobs/${job.id}`} className="hover:underline">
            {job.title}
          </Link>
        </h3>
        <p className="text-sm text-brand-ink-secondary">{job.company.name}</p>
        {salary ? (
          <p className="text-sm font-medium text-brand-ink-secondary">{salary}</p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <DarkTag>{WORK_MODE_LABELS[job.workMode]}</DarkTag>
        {job.location ? <DarkTag>{job.location}</DarkTag> : null}
        <DarkTag>{LEVEL_LABELS[job.level]}</DarkTag>
      </div>

      {shownSkills.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {shownSkills.map((name) => (
            <LightTag key={name}>{name}</LightTag>
          ))}
          {extraSkills > 0 ? <LightTag>+{extraSkills} more</LightTag> : null}
        </div>
      ) : null}

      {actions === undefined ? (
        <div className="mt-auto flex gap-2 pt-1">
          <Button
            asChild
            className="h-9 flex-1 rounded-[8px] bg-brand-ink text-sm font-medium text-white hover:bg-brand-ink/90"
          >
            <Link href={`/candidate/jobs/${job.id}`}>View Role</Link>
          </Button>
          <JobCardApplyButton jobId={job.id} disabled={closed || applied} />
        </div>
      ) : (
        actions
      )}

      <p className="flex items-center gap-1.5 text-[11px] text-brand-ink-secondary">
        <span>{postedAgo(job.createdAt)}</span>
        {state ? (
          <>
            <span aria-hidden className="size-1 rounded-full bg-brand-ink-secondary" />
            <span>{state}</span>
          </>
        ) : null}
      </p>
    </article>
  );
}

function DarkTag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-5 items-center rounded-[6px] bg-tag-2 px-2 text-[11px] text-white">
      {children}
    </span>
  );
}

function LightTag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-5 items-center rounded-[6px] bg-tag-1 px-2 text-[11px] text-brand-ink">
      {children}
    </span>
  );
}
