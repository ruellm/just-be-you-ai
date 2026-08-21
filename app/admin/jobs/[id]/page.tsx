import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { formatLongDate } from "@/lib/dates";
import {
  formatSalary,
  LEVEL_LABELS,
  postedAgo,
  WORK_MODE_LABELS,
} from "@/lib/jobs";
import {
  DarkTag,
  SectionCard,
  SkillChip,
  TextSection,
} from "@/components/jobs/JobSections";
import { JobHeaderActions } from "./JobHeaderActions";

export default async function AdminJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
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
            <p className="text-body font-semibold text-brand-ink-secondary">{salary}</p>
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
