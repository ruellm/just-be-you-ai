import type { ReactNode } from "react";
import type { Prisma } from "@prisma/client";
import { FileText } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  BTN_INK,
  BTN_PRIMARY,
  INSET_PANEL,
  ProfileSectionCard,
} from "@/app/candidate/profile/ProfileSectionCard";
import { EMPLOYMENT_TYPE_LABELS } from "@/app/candidate/profile/schemas";
import { formatLongDate } from "@/lib/dates";
import {
  dateToInput,
  displayDateRange,
  parseResumeMeta,
} from "@/lib/profile-format";
import { cn } from "@/lib/utils";

// S9 — the candidate profile blocks shared by the two admin views:
//   /admin/users/[id]          (Read User Profile)
//   /admin/applications/[id]   (User Profile Revealed, "Profile Information")
// Admin-only: nothing here is gated, and the candidate-facing U5 company gate
// deliberately does NOT apply in the admin portal.

export const ADMIN_CANDIDATE_INCLUDE = {
  skills: { include: { skill: true }, orderBy: { yearsOfExperience: "desc" } },
  educations: { orderBy: { startDate: "desc" } },
  workExperiences: { orderBy: { startDate: "desc" } },
  projects: {
    orderBy: { startDate: "desc" },
    include: { skills: { include: { skill: true } } },
  },
} satisfies Prisma.CandidateProfileInclude;

export type AdminCandidateProfile = Prisma.CandidateProfileGetPayload<{
  include: typeof ADMIN_CANDIDATE_INCLUDE;
}>;

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-heading font-semibold text-brand-primary">{children}</h2>
  );
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/[\s._@-]+/).filter(Boolean);
  return parts.slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join("") || "?";
}

// 60px avatar + name + email, with an optional actions slot on the right.
export function AdminProfileHeader({
  name,
  email,
  avatarUrl,
  badges,
  actions,
}: {
  name: string;
  email: string;
  avatarUrl: string | null;
  badges?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-4">
        <Avatar className="size-[60px] rounded-[8px] after:rounded-[8px] after:border-brand-border">
          {avatarUrl ? (
            <AvatarImage src={avatarUrl} alt="" className="rounded-[8px]" />
          ) : null}
          <AvatarFallback className="rounded-[8px] bg-brand-container text-subheading font-semibold text-brand-primary">
            {initialsOf(name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-section font-semibold tracking-[-0.5px] text-brand-primary">
              {name}
            </h1>
            {badges}
          </div>
          <p className="mt-1 text-body text-brand-ink-secondary">{email}</p>
        </div>
      </div>
      {actions}
    </div>
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
  const text =
    value === null || value === undefined || value === "" ? "—" : String(value);
  return (
    <div className="min-w-0">
      <dt className="text-small font-semibold text-brand-ink">{label}</dt>
      <dd className="mt-0.5 truncate text-small text-brand-ink">
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

export function BasicInformationCard({
  profile,
  joinedAt,
}: {
  profile: AdminCandidateProfile;
  joinedAt: Date;
}) {
  return (
    <ProfileSectionCard>
      <SectionTitle>Basic Information</SectionTitle>
      <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
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
        <Field label="Joined Date" value={formatLongDate(joinedAt)} />
      </dl>
    </ProfileSectionCard>
  );
}

export function ProfileSummaryCard({
  profile,
}: {
  profile: AdminCandidateProfile;
}) {
  return (
    <ProfileSectionCard>
      <SectionTitle>Profile Summary</SectionTitle>
      <p className="text-body text-brand-ink">
        {profile.summary?.trim() || "No summary provided."}
      </p>
    </ProfileSectionCard>
  );
}

// View / Download are DISABLED: the only signed-URL action in the codebase
// (getCandidateResumeSignedUrl) requires a company ProfileUnlock and is not
// reusable for admin. An admin-scoped action is a deliberate follow-on.
export function ResumeCard({ profile }: { profile: AdminCandidateProfile }) {
  const resume = parseResumeMeta(profile.resumeUrl ?? null);
  return (
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
            <FileText
              className="size-10 shrink-0 text-brand-ink-secondary"
              strokeWidth={1.25}
            />
            <div className="min-w-0">
              <p className="truncate text-body font-semibold text-brand-ink">
                {resume.filename}
              </p>
              <p className="text-small text-brand-ink-secondary">
                {resume.uploadedAt
                  ? `Uploaded on ${formatLongDate(new Date(resume.uploadedAt))}`
                  : "Uploaded"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled className={BTN_INK}>
              View
            </Button>
            <Button type="button" disabled className={BTN_PRIMARY}>
              Download Resume
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-small text-brand-ink-secondary">Not uploaded.</p>
      )}
    </ProfileSectionCard>
  );
}

export function EducationCard({ profile }: { profile: AdminCandidateProfile }) {
  return (
    <ProfileSectionCard>
      <SectionTitle>Education</SectionTitle>
      {profile.educations.length === 0 ? (
        <p className="text-small text-brand-ink-secondary">
          No education added.
        </p>
      ) : (
        <div className="space-y-4">
          {profile.educations.map((e) => (
            <div key={e.id} className={cn(INSET_PANEL, "bg-brand-surface p-5")}>
              <p className="text-body font-semibold text-brand-ink">{e.school}</p>
              <p className="text-small text-brand-ink-secondary">
                {[e.degree, e.fieldOfStudy].filter(Boolean).join(" in ") || "—"}
              </p>
              <p className="flex flex-wrap items-center gap-2 text-small text-brand-ink-secondary">
                {e.country ? (
                  <>
                    <span>{e.country}</span>
                    <span
                      aria-hidden
                      className="size-1 rounded-full bg-brand-ink-secondary"
                    />
                  </>
                ) : null}
                <span>
                  {displayDateRange(
                    dateToInput(e.startDate),
                    dateToInput(e.endDate),
                    e.currentlyStudying
                  )}
                </span>
              </p>
            </div>
          ))}
        </div>
      )}
    </ProfileSectionCard>
  );
}

export function SkillsCard({ profile }: { profile: AdminCandidateProfile }) {
  return (
    <ProfileSectionCard>
      <SectionTitle>Skills</SectionTitle>
      {profile.skills.length === 0 ? (
        <p className="text-small text-brand-ink-secondary">No skills added.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {profile.skills.map((s) => (
            <span
              key={s.id}
              className="inline-flex h-[26px] items-center gap-2 rounded-[6px] bg-brand-tertiary px-3 text-small text-brand-ink"
            >
              {s.skill.name}
              <span aria-hidden className="size-1 rounded-full bg-brand-ink" />
              {s.yearsOfExperience}y
            </span>
          ))}
        </div>
      )}
    </ProfileSectionCard>
  );
}

export function WorkExperienceCard({
  profile,
}: {
  profile: AdminCandidateProfile;
}) {
  return (
    <ProfileSectionCard>
      <SectionTitle>Work Experience</SectionTitle>
      {profile.workExperiences.length === 0 ? (
        <p className="text-small text-brand-ink-secondary">
          No work experience added.
        </p>
      ) : (
        <div className="space-y-4">
          {profile.workExperiences.map((w) => (
            <div key={w.id} className={cn(INSET_PANEL, "bg-brand-surface p-5")}>
              <p className="text-body font-semibold text-brand-ink">
                {w.position}
              </p>
              <p className="flex flex-wrap items-center gap-2 text-small text-brand-ink-secondary">
                <span>{w.companyName}</span>
                <span
                  aria-hidden
                  className="size-1 rounded-full bg-brand-ink-secondary"
                />
                <span>{EMPLOYMENT_TYPE_LABELS[w.employmentType]}</span>
              </p>
              <p className="text-small text-brand-ink-secondary">
                {displayDateRange(
                  dateToInput(w.startDate),
                  dateToInput(w.endDate),
                  w.currentlyWorking
                )}
              </p>
              {w.description ? (
                <p className="mt-4 text-small whitespace-pre-line text-brand-ink">
                  {w.description}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </ProfileSectionCard>
  );
}

// Plain shape for the Projects card so views with their own DTOs (the
// business candidate page) can render the same block. Dates are "YYYY-MM-DD".
export type ProjectCardItem = {
  id: string;
  name: string;
  url: string | null;
  startDate: string;
  endDate: string;
  ongoing: boolean;
  description: string | null;
  skills: string[];
};

export function projectCardItems(
  profile: AdminCandidateProfile
): ProjectCardItem[] {
  return profile.projects.map((p) => ({
    id: p.id,
    name: p.name,
    url: p.url,
    startDate: dateToInput(p.startDate),
    endDate: dateToInput(p.endDate),
    ongoing: p.ongoing,
    description: p.description,
    skills: p.skills.map((ps) => ps.skill.name),
  }));
}

export function ProjectsCard({ projects }: { projects: ProjectCardItem[] }) {
  return (
    <ProfileSectionCard>
      <SectionTitle>Projects</SectionTitle>
      {projects.length === 0 ? (
        <p className="text-small text-brand-ink-secondary">No projects added.</p>
      ) : (
        <div className="space-y-4">
          {projects.map((p) => (
            <div key={p.id} className={cn(INSET_PANEL, "bg-brand-surface p-5")}>
              <p className="text-body font-semibold text-brand-ink">{p.name}</p>
              {p.url ? (
                <p className="min-w-0 truncate text-small text-brand-ink-secondary">
                  URL:{" "}
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noreferrer"
                    className="underline hover:text-brand-primary"
                  >
                    {p.url}
                  </a>
                </p>
              ) : null}
              <p className="text-small text-brand-ink-secondary">
                {displayDateRange(p.startDate, p.endDate, p.ongoing)}
              </p>
              {p.description ? (
                <p className="mt-4 text-small whitespace-pre-line text-brand-ink">
                  {p.description}
                </p>
              ) : null}
              {p.skills.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {p.skills.map((name) => (
                    <span
                      key={name}
                      className="inline-flex h-[21px] items-center rounded-[6px] bg-tag-1 px-3 text-meta text-brand-ink"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </ProfileSectionCard>
  );
}

// Sections 2-8 in the design order, rendered by BOTH admin views.
export function CandidateProfileSections({
  profile,
  joinedAt,
}: {
  profile: AdminCandidateProfile;
  joinedAt: Date;
}) {
  return (
    <>
      <BasicInformationCard profile={profile} joinedAt={joinedAt} />
      <ProfileSummaryCard profile={profile} />
      <ResumeCard profile={profile} />
      <EducationCard profile={profile} />
      <SkillsCard profile={profile} />
      <WorkExperienceCard profile={profile} />
      <ProjectsCard projects={projectCardItems(profile)} />
    </>
  );
}
