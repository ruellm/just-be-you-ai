import { notFound, redirect } from "next/navigation";
import { getCurrentCompany } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { resolveMustHaveKeys } from "@/lib/ai/rubric";
import { JobForm } from "../../JobForm";
import type { JobValues } from "../../schemas";

export default async function EditJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const company = await getCurrentCompany();
  if (!company) redirect("/login");

  const job = await prisma.job.findFirst({
    where: { id, companyId: company.id },
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
    // DB column is a plain String — narrow to the schema enum defensively.
    voiceAgentType: job.voiceAgentType === "advanced" ? "advanced" : "basic",
    passingBar: job.passingBar === "standard" ? "standard" : "selective",
    // null (or malformed) → the rubric's default set, pre-checked; an explicit
    // stored array (including []) is respected as-is.
    mustHaveCriteria: resolveMustHaveKeys(job.mustHaveCriteriaJson),
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-8">
      <h1 className="text-2xl font-semibold">Edit job</h1>
      <JobForm
        mode="edit"
        jobId={job.id}
        defaultValues={defaults}
        skillOptions={skillOptions}
      />
    </div>
  );
}
