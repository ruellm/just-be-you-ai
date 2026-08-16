import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ArrowLeft, FileText } from "lucide-react";
import { prisma } from "@/lib/db";
import { countInterviewSeatsUsed } from "@/lib/interview-seats";
import { userDisplayName } from "@/lib/admin";
import { formatLongDate } from "@/lib/dates";
import {
  dateToInput,
  displayDateRange,
  parseResumeMeta,
} from "@/lib/profile-format";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RoleBadge } from "@/components/admin/RoleBadge";
import {
  BTN_INK,
  BTN_PRIMARY,
  INSET_PANEL,
  ProfileSectionCard,
} from "@/app/candidate/profile/ProfileSectionCard";
import { EMPLOYMENT_TYPE_LABELS } from "@/app/candidate/profile/schemas";
import { UserHeaderActions } from "./UserHeaderActions";

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-2xl font-semibold text-brand-primary">{children}</h2>
  );
}

function Field({
  label,
  value,
  href,
}: {
  label: string;
  value: string | number | null | undefined;
  href?: string;
}) {
  const text = value === null || value === undefined || value === "" ? "—" : String(value);
  return (
    <div className="min-w-0">
      <dt className="text-sm font-semibold text-brand-ink">{label}</dt>
      <dd className="mt-0.5 truncate text-sm text-brand-ink">
        {href && text !== "—" ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
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

function initialsOf(name: string): string {
  const parts = name.trim().split(/[\s._@-]+/).filter(Boolean);
  return parts.slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join("") || "?";
}

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      candidateProfile: {
        include: {
          skills: { include: { skill: true }, orderBy: { yearsOfExperience: "desc" } },
          educations: { orderBy: { startDate: "desc" } },
          workExperiences: { orderBy: { startDate: "desc" } },
          _count: { select: { applications: true } },
        },
      },
      company: { include: { _count: { select: { jobs: true } } } },
    },
  });
  if (!user) notFound();

  const applicantCount =
    user.role === "business" && user.company
      ? await prisma.application.count({
          where: { job: { companyId: user.company.id } },
        })
      : 0;

  const candidateApplications =
    user.role === "candidate" && user.candidateProfile
      ? await prisma.application.findMany({
          where: { candidateProfileId: user.candidateProfile.id },
          orderBy: { createdAt: "desc" },
          select: { id: true, job: { select: { title: true } } },
        })
      : [];

  const profile = user.candidateProfile;
  const interviewSeatsUsed =
    user.role === "candidate" && profile
      ? await countInterviewSeatsUsed(prisma, profile.id)
      : 0;
  const name = userDisplayName(user);
  const resume = parseResumeMeta(profile?.resumeUrl ?? null);

  return (
    <div className="space-y-6 px-6 py-8 font-body lg:px-14">
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-2 text-xl font-semibold tracking-[-0.5px] text-brand-primary hover:underline"
      >
        <ArrowLeft className="size-5" /> Back to Previous
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar className="size-[60px] rounded-[8px] after:rounded-[8px] after:border-brand-border">
            <AvatarFallback className="rounded-[8px] bg-brand-container text-lg font-semibold text-brand-primary">
              {initialsOf(name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-[32px] leading-8 font-semibold tracking-[-0.5px] text-brand-primary">
                {name}
              </h1>
              <RoleBadge role={user.role} />
              {user.requiresPasswordChange ? (
                <Badge
                  variant="outline"
                  className="border-brand-border text-[10px] font-medium text-amber-700"
                >
                  Pending password change
                </Badge>
              ) : null}
            </div>
            <p className="mt-1 text-base text-brand-ink-secondary">{user.email}</p>
          </div>
        </div>
        <UserHeaderActions
          userId={user.id}
          name={name}
          role={user.role}
          candidateProfileId={profile?.id ?? null}
          companyId={user.company?.id ?? null}
          seatsUsed={interviewSeatsUsed}
          seatsTotal={profile?.interviewSeatsTotal ?? 0}
        />
      </div>

      <ProfileSectionCard>
        <SectionTitle>Basic Information</SectionTitle>
        <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
          {user.role === "candidate" && profile ? (
            <>
              <Field label="Country of Residence" value={profile.country} />
              <Field label="City" value={profile.city} />
              <Field label="Nationality" value={profile.nationality} />
              <Field label="Phone" value={profile.phone} />
              <Field
                label="LinkedIn URL"
                value={profile.linkedinUrl}
                href={profile.linkedinUrl ?? undefined}
              />
              <Field
                label="Expected Salary (PHP / month)"
                value={profile.expectedSalary}
              />
              <Field
                label="Total Years of Experience"
                value={profile.totalYearsExperience}
              />
              <Field label="Joined Date" value={formatLongDate(user.createdAt)} />
              <Field label="Preferred Role" value={profile.preferredRole} />
              <Field
                label="Languages Spoken"
                value={profile.languages.length ? profile.languages.join(", ") : null}
              />
              <Field label="Applications" value={profile._count.applications} />
            </>
          ) : (
            <>
              <Field label="Email" value={user.email} />
              <Field label="Role" value={user.role === "business" ? "Business" : "Admin"} />
              <Field label="Joined Date" value={formatLongDate(user.createdAt)} />
              {user.role === "business" && user.company ? (
                <>
                  <Field label="Company Name" value={user.company.name} />
                  <Field label="Jobs Posted" value={user.company._count.jobs} />
                  <Field label="Total Applicants" value={applicantCount} />
                </>
              ) : null}
            </>
          )}
        </dl>
        {user.role === "business" && user.company ? (
          <Button asChild className={BTN_INK}>
            <Link href={`/admin/companies/${user.company.id}`}>
              View Company Detail
            </Link>
          </Button>
        ) : null}
      </ProfileSectionCard>

      {user.role === "candidate" && profile ? (
        <>
          <ProfileSectionCard>
            <SectionTitle>Profile Summary</SectionTitle>
            <p className="text-base leading-6 text-brand-ink">
              {profile.summary?.trim() || "No summary provided."}
            </p>
          </ProfileSectionCard>

          <ProfileSectionCard>
            <SectionTitle>Work Experience</SectionTitle>
            {profile.workExperiences.length === 0 ? (
              <p className="text-sm text-brand-ink-secondary">No work experience added.</p>
            ) : (
              <div className="space-y-4">
                {profile.workExperiences.map((w) => (
                  <div key={w.id} className={cn(INSET_PANEL, "bg-brand-surface p-5")}>
                    <p className="text-base font-semibold text-brand-ink">{w.position}</p>
                    <p className="text-sm text-brand-ink-secondary">
                      {w.companyName}
                      <span className="mx-2">•</span>
                      {EMPLOYMENT_TYPE_LABELS[w.employmentType]}
                    </p>
                    <p className="text-sm text-brand-ink-secondary">
                      {displayDateRange(
                        dateToInput(w.startDate),
                        dateToInput(w.endDate),
                        w.currentlyWorking
                      )}
                    </p>
                    {w.description ? (
                      <p className="mt-4 text-sm leading-5 whitespace-pre-line text-brand-ink">
                        {w.description}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </ProfileSectionCard>

          <ProfileSectionCard>
            <SectionTitle>Education</SectionTitle>
            {profile.educations.length === 0 ? (
              <p className="text-sm text-brand-ink-secondary">No education added.</p>
            ) : (
              <div className="space-y-4">
                {profile.educations.map((e) => (
                  <div key={e.id} className={cn(INSET_PANEL, "bg-brand-surface p-5")}>
                    <p className="text-base font-semibold text-brand-ink">{e.school}</p>
                    <p className="text-sm text-brand-ink-secondary">
                      {[e.degree, e.fieldOfStudy].filter(Boolean).join(" in ") || "—"}
                    </p>
                    <p className="text-sm text-brand-ink-secondary">
                      {e.country ? (
                        <>
                          {e.country}
                          <span className="mx-2">•</span>
                        </>
                      ) : null}
                      {displayDateRange(
                        dateToInput(e.startDate),
                        dateToInput(e.endDate),
                        e.currentlyStudying
                      )}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </ProfileSectionCard>

          <ProfileSectionCard>
            <SectionTitle>Skills</SectionTitle>
            {profile.skills.length === 0 ? (
              <p className="text-sm text-brand-ink-secondary">No skills added.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((s) => (
                  <span
                    key={s.id}
                    className="inline-flex h-[26px] items-center gap-2 rounded-[6px] bg-brand-tertiary px-3 text-sm text-brand-ink"
                  >
                    {s.skill.name}
                    <span className="size-1 rounded-full bg-brand-ink" aria-hidden />
                    {s.yearsOfExperience}y
                  </span>
                ))}
              </div>
            )}
          </ProfileSectionCard>

          <ProfileSectionCard>
            <SectionTitle>Resume</SectionTitle>
            {resume ? (
              <div
                className={cn(
                  INSET_PANEL,
                  "flex flex-wrap items-center justify-between gap-4 bg-brand-surface p-5"
                )}
              >
                <div className="flex min-w-0 items-center gap-4">
                  <FileText className="size-10 shrink-0 text-brand-ink-secondary" strokeWidth={1.25} />
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-brand-ink">
                      {resume.filename}
                    </p>
                    <p className="text-sm text-brand-ink-secondary">
                      {resume.uploadedAt
                        ? `Uploaded on ${formatLongDate(new Date(resume.uploadedAt))}`
                        : "Uploaded"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" disabled className={BTN_INK}>
                    View in New Tab
                  </Button>
                  <Button type="button" disabled className={BTN_PRIMARY}>
                    Download Resume
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-brand-ink-secondary">Not uploaded.</p>
            )}
          </ProfileSectionCard>

          {profile.parsedResumeText ? (
            <details className="rounded-[12px] border border-brand-border bg-brand-surface">
              <summary className="cursor-pointer px-6 py-4 text-sm font-medium text-brand-ink-secondary">
                Parsed resume text ({profile.parsedResumeText.length} chars) — debug
              </summary>
              <pre className="max-h-96 overflow-auto border-t border-brand-border px-6 py-4 font-mono text-xs whitespace-pre-wrap text-brand-ink-secondary">
                {profile.parsedResumeText}
              </pre>
            </details>
          ) : null}

          {candidateApplications.length > 0 ? (
            <ProfileSectionCard>
              <SectionTitle>Applications</SectionTitle>
              <div className="divide-y divide-brand-border">
                {candidateApplications.map((app) => (
                  <div
                    key={app.id}
                    className="flex items-center justify-between gap-3 py-3"
                  >
                    <span className="truncate text-sm font-medium text-brand-ink">
                      {app.job.title}
                    </span>
                    <Link
                      href={`/admin/applications/${app.id}/questions`}
                      className="shrink-0 text-sm font-semibold text-brand-primary hover:underline"
                    >
                      View generated questions
                    </Link>
                  </div>
                ))}
              </div>
            </ProfileSectionCard>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
