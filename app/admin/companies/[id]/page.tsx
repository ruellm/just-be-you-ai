import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { formatLongDate } from "@/lib/dates";
import {
  companyInitial,
  formatSalary,
  LEVEL_LABELS,
  postedAgo,
  WORK_MODE_LABELS,
} from "@/lib/jobs";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  BTN_INK,
  BTN_PRIMARY,
  ProfileSectionCard,
} from "@/app/candidate/profile/ProfileSectionCard";
import { CompanyHeaderActions } from "./CompanyHeaderActions";

const MAX_SKILL_CHIPS = 3;

function Field({
  label,
  value,
  href,
}: {
  label: string;
  value: string | number | null | undefined;
  href?: string;
}) {
  const text =
    value === null || value === undefined || value === "" ? "—" : String(value);
  return (
    <div className="min-w-0">
      <dt className="text-sm font-semibold text-brand-ink">{label}</dt>
      <dd className="mt-0.5 truncate text-sm text-brand-ink">
        {href && text !== "—" ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-brand-primary hover:underline"
          >
            {text}
          </a>
        ) : (
          text
        )}
      </dd>
    </div>
  );
}

const DARK_CHIP =
  "rounded-[6px] bg-tag-2 px-2.5 py-0.5 text-xs font-medium text-white";
const LIGHT_CHIP =
  "rounded-[6px] bg-brand-tertiary px-2.5 py-0.5 text-xs font-medium text-brand-ink";

export default async function AdminCompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      user: { select: { email: true, createdAt: true } },
      _count: { select: { profileUnlocks: true } },
      jobs: {
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { applications: true } },
          skills: { include: { skill: { select: { name: true } } } },
        },
      },
    },
  });
  if (!company) notFound();

  const name = company.name || "(unnamed company)";

  return (
    <div className="space-y-6 px-6 py-8 font-body lg:px-14">
      <Link
        href="/admin/companies"
        className="inline-flex items-center gap-2 text-xl font-semibold tracking-[-0.5px] text-brand-primary hover:underline"
      >
        <ArrowLeft className="size-5" /> Back to Previous
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar className="size-[60px] rounded-[8px] after:rounded-[8px] after:border-brand-border">
            {company.logoUrl ? (
              <AvatarImage src={company.logoUrl} alt="" className="rounded-[8px]" />
            ) : null}
            <AvatarFallback className="rounded-[8px] bg-brand-container text-lg font-semibold text-brand-primary">
              {companyInitial(name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h1 className="truncate text-[32px] leading-8 font-semibold tracking-[-0.5px] text-brand-primary">
              {name}
            </h1>
            <p className="mt-1 text-base text-brand-ink-secondary">{company.user.email}</p>
          </div>
        </div>
        <CompanyHeaderActions
          companyId={company.id}
          name={name}
          seatsUsed={company._count.profileUnlocks}
          seatsTotal={company.seatsTotal}
        />
      </div>

      <ProfileSectionCard>
        <h2 className="text-2xl font-semibold text-brand-primary">Basic Information</h2>
        <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Year Founded" value={company.yearFounded} />
          <Field label="Contact Mail" value={company.contactEmail} />
          <Field label="Phone" value={company.phone} />
          <Field label="Headquarters" value={company.headquarters} />
          <Field
            label="Company Website"
            value={company.website}
            href={company.website ?? undefined}
          />
          <Field label="Type" value={company.type} />
          <Field label="Industry" value={company.industry} />
          <Field label="Joined Date" value={formatLongDate(company.createdAt)} />
          <Field label="Owner Mail" value={company.user.email} />
          <Field label="Owner Joined" value={formatLongDate(company.user.createdAt)} />
        </dl>
      </ProfileSectionCard>

      <ProfileSectionCard>
        <h2 className="text-2xl font-semibold text-brand-primary">Company Description</h2>
        <p className="text-base leading-6 whitespace-pre-line text-brand-ink">
          {company.description?.trim() || "No description provided."}
        </p>
      </ProfileSectionCard>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-brand-primary">
          Jobs Posted{" "}
          <span className="text-base font-semibold text-brand-ink-secondary">
            ({company.jobs.length})
          </span>
        </h2>
        {company.jobs.length === 0 ? (
          <p className="text-sm text-brand-ink-secondary">No jobs posted yet.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {company.jobs.map((job) => {
              const salary = formatSalary(job.salaryMin, job.salaryMax);
              const skillNames = job.skills.map((s) => s.skill.name);
              const extra = skillNames.length - MAX_SKILL_CHIPS;
              return (
                <div
                  key={job.id}
                  className="flex flex-col gap-3 rounded-[12px] border border-brand-border bg-brand-surface p-5"
                >
                  <div>
                    <p className="text-xl leading-6 font-semibold text-brand-primary">
                      {job.title}
                    </p>
                    <p className="mt-1 text-sm text-brand-ink">
                      {salary ?? "Salary not specified"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className={DARK_CHIP}>{WORK_MODE_LABELS[job.workMode]}</span>
                    {job.location ? (
                      <span className={DARK_CHIP}>{job.location}</span>
                    ) : null}
                    <span className={DARK_CHIP}>{LEVEL_LABELS[job.level]}</span>
                    <span
                      className={cn(
                        "rounded-[6px] px-2.5 py-0.5 text-xs font-medium",
                        job.status === "open"
                          ? "bg-status-success text-accent-3"
                          : "bg-brand-container text-brand-ink-secondary"
                      )}
                    >
                      {job.status === "open" ? "Open" : "Closed"}
                    </span>
                  </div>
                  {skillNames.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {skillNames.slice(0, MAX_SKILL_CHIPS).map((s) => (
                        <span key={s} className={LIGHT_CHIP}>
                          {s}
                        </span>
                      ))}
                      {extra > 0 ? (
                        <span className={LIGHT_CHIP}>+{extra} more</span>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="mt-1 grid grid-cols-2 gap-2">
                    <Button asChild className={cn(BTN_INK, "h-10")}>
                      <Link href={`/admin/jobs/${job.id}`}>View Role</Link>
                    </Button>
                    <Button asChild className={cn(BTN_PRIMARY, "h-10")}>
                      <Link href={`/admin/jobs/${job.id}/edit`}>Edit Role</Link>
                    </Button>
                  </div>
                  <p className="text-xs text-brand-ink-secondary">
                    {postedAgo(job.createdAt)}
                    <span className="mx-1.5">•</span>
                    {job._count.applications}{" "}
                    {job._count.applications === 1 ? "applicant" : "applicants"}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
