import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { resolveMustHaveKeys } from "@/lib/ai/rubric";
import type { JobValues } from "@/app/business/jobs/schemas";
import { AdminJobForm } from "./AdminJobForm";

export default async function AdminEditJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const job = await prisma.job.findUnique({
    where: { id },
    include: { skills: true },
  });
  if (!job) notFound();

  const skillOptions = await prisma.skill.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const defaults: JobValues = {
    title: job.title,
    description: job.description,
    roleOverview: job.roleOverview ?? "",
    requirements: job.requirements ?? "",
    dayToDay: job.dayToDay ?? "",
    level: job.level,
    workMode: job.workMode,
    location: job.location ?? "",
    salaryMin: job.salaryMin != null ? String(job.salaryMin) : "",
    salaryMax: job.salaryMax != null ? String(job.salaryMax) : "",
    status: job.status,
    skillIds: job.skills.map((s) => s.skillId),
    interviewHints: job.interviewHints ?? "",
    idealCandidateProfile: job.idealCandidateProfile ?? "",
    passingCriteria: job.passingCriteria ?? "",
    interviewMaxMinutes:
      job.interviewMaxMinutes != null ? String(job.interviewMaxMinutes) : "",
    voiceAgentType: job.voiceAgentType === "advanced" ? "advanced" : "basic",
    passingBar: job.passingBar === "standard" ? "standard" : "selective",
    mustHaveCriteria: resolveMustHaveKeys(job.mustHaveCriteriaJson),
  };

  return (
    <div className="space-y-6 px-6 py-8 font-body lg:px-14">
      <Link
        href={`/admin/jobs/${job.id}`}
        className="inline-flex items-center gap-2 text-subheading font-semibold tracking-[-0.5px] text-brand-primary hover:underline"
      >
        <ArrowLeft className="size-5" /> Back to Jobs
      </Link>
      <div className="space-y-2 border-b border-brand-border pb-5">
        <h1 className="text-page-title font-semibold tracking-[-0.5px] text-brand-primary">
          Edit Job Posting
        </h1>
        <p className="text-body tracking-[-0.5px] text-brand-ink-secondary">
          Update role details, adjust requirements, or modify interview settings
          for this posting.
        </p>
      </div>
      <AdminJobForm
        jobId={job.id}
        defaultValues={defaults}
        skillOptions={skillOptions}
      />
    </div>
  );
}
