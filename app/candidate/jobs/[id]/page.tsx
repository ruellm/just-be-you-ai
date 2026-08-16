import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { applicationPath } from "@/lib/applications";
import { OUT_OF_SEATS_SHORT, getInterviewSeatBalance } from "@/lib/interview-seats";
import {
  LEVEL_LABELS,
  WORK_MODE_LABELS,
  formatSalary,
  postedAgo,
} from "@/lib/jobs";
import { cn } from "@/lib/utils";
import {
  DarkTag,
  SectionCard,
  SkillChip,
  TextSection,
} from "@/components/jobs/JobSections";
import { ApplyButton } from "./ApplyButton";

const CTA_CLASS = "h-9 rounded-[8px] px-5 font-body text-sm font-medium text-white";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const job = await prisma.job.findUnique({
    where: { id },
    include: { company: true, skills: { include: { skill: true } } },
  });
  if (!job) notFound();

  const salary = formatSalary(job.salaryMin, job.salaryMax);
  const closed = job.status === "closed";

  // Application state for the current candidate (drives the CTA).
  const user = await getCurrentUser();
  const profile = user
    ? await prisma.candidateProfile.findUnique({
        where: { userId: user.id },
        select: { id: true },
      })
    : null;
  const existing = profile
    ? await prisma.application.findUnique({
        where: {
          candidateProfileId_jobId: {
            candidateProfileId: profile.id,
            jobId: job.id,
          },
        },
        select: { id: true, status: true },
      })
    : null;
  const seatBalance =
    profile && !existing ? await getInterviewSeatBalance(prisma, profile.id) : null;
  const noSeats = seatBalance != null && seatBalance.remaining === 0;

  // Four CTA states, all preserved: closed / no profile / already applied /
  // apply. Only the disabled + helper-link variants need extra markup.
  let cta: ReactNode;
  if (closed) {
    cta = (
      <Button
        disabled
        className={cn(CTA_CLASS, "bg-brand-border disabled:opacity-100")}
      >
        Apply Now
      </Button>
    );
  } else if (!profile) {
    cta = (
      <div className="space-y-2 md:text-right">
        <Button
          disabled
          className={cn(CTA_CLASS, "bg-brand-border disabled:opacity-100")}
        >
          Apply Now
        </Button>
        <p className="text-xs text-brand-ink-secondary">
          Complete your{" "}
          <Link
            href="/candidate/profile"
            className="underline hover:text-brand-primary"
          >
            basic info
          </Link>{" "}
          before applying.
        </p>
      </div>
    );
  } else if (existing) {
    cta = (
      <Button
        asChild
        className={cn(CTA_CLASS, "bg-brand-ink hover:bg-brand-ink/90")}
      >
        <Link href={applicationPath(existing.id, existing.status)}>
          {existing.status === "submitted"
            ? "Continue your interview"
            : "View your result"}
        </Link>
      </Button>
    );
  } else if (noSeats) {
    cta = (
      <div className="space-y-2 md:text-right">
        <Button
          disabled
          className={cn(CTA_CLASS, "bg-brand-border disabled:opacity-100")}
        >
          Apply Now
        </Button>
        <p className="text-xs text-brand-ink-secondary">{OUT_OF_SEATS_SHORT}</p>
      </div>
    );
  } else {
    cta = (
      <ApplyButton
        jobId={job.id}
        className={cn(CTA_CLASS, "bg-brand-secondary hover:bg-brand-secondary/90")}
        label="Apply Now"
      />
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-10 font-body lg:px-14 lg:py-14">
      <Link
        href="/candidate/jobs"
        className="inline-flex items-center gap-2 text-xl font-semibold text-brand-primary hover:underline"
      >
        <ArrowLeft className="size-5" /> Back to Jobs
      </Link>

      {closed ? (
        <div className="rounded-[12px] border border-brand-border bg-status-fail px-4 py-3 text-sm text-accent-2">
          This job is no longer accepting applications.
        </div>
      ) : null}

      {/* Top block */}
      <div className="flex flex-col gap-6 border-b border-brand-border pb-8 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold text-brand-primary">
              {job.title}
            </h1>
            <p className="text-base text-brand-ink-secondary">
              {job.company.name}
            </p>
          </div>
          {salary ? (
            <p className="text-base font-semibold text-brand-ink-secondary">
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
          {cta}
          <p className="text-xs text-brand-ink-secondary">
            {postedAgo(job.createdAt)}
          </p>
        </div>
      </div>

      {/* Content sections */}
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
          <p className="text-base text-brand-ink">
            After you apply, you&apos;ll complete a short AI interview. Results
            are shared with {job.company.name} along with your profile.
          </p>
        </SectionCard>
      </div>
    </div>
  );
}
