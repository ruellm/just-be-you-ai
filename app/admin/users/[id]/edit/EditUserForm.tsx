"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { EmploymentType, Role } from "@prisma/client";
import { ExternalLink, FileText, Pencil, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatLongDate } from "@/lib/dates";
import { displayDateRange } from "@/lib/profile-format";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LanguagesInput } from "@/components/profile/LanguagesInput";
import { MODAL_INPUT, Req } from "@/components/profile/FormModal";
import {
  BTN_DANGER,
  BTN_INK,
  BTN_PRIMARY,
  INSET_PANEL,
  ProfileSectionCard,
  ProfileSectionHeader,
} from "@/app/candidate/profile/ProfileSectionCard";
import {
  EMPLOYMENT_TYPE_LABELS,
  FIELD_LIMITS,
} from "@/app/candidate/profile/schemas";

const LABEL = "text-sm font-semibold text-brand-ink";
const INPUT = cn(MODAL_INPUT, "h-9 placeholder:text-brand-ink-secondary/60");
const SMALL_BTN = "h-8 rounded-[8px] px-3 text-xs font-semibold text-white";

type Resume = { filename: string; uploadedAt: string | null } | null;

export type EditableProfile = {
  firstName: string;
  middleName: string;
  lastName: string;
  suffix: string;
  country: string;
  city: string;
  nationality: string;
  phone: string;
  linkedinUrl: string;
  expectedSalary: string;
  totalYearsExperience: string;
  preferredRole: string;
  languages: string[];
  summary: string;
  resume: Resume;
  educations: {
    id: string;
    school: string;
    degree: string | null;
    fieldOfStudy: string | null;
    country: string | null;
    start: string;
    end: string;
    current: boolean;
  }[];
  skills: { id: string; name: string; years: number }[];
  workExperiences: {
    id: string;
    position: string;
    companyName: string;
    employmentType: EmploymentType;
    start: string;
    end: string;
    current: boolean;
    description: string | null;
  }[];
  projects: {
    id: string;
    name: string;
    url: string | null;
    start: string;
    end: string;
    ongoing: boolean;
    description: string | null;
    skills: string[];
  }[];
};

function Field({
  label,
  required,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label className={LABEL}>
        {label}
        {required ? <Req /> : null}
      </label>
      {children}
    </div>
  );
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/[\s._@-]+/).filter(Boolean);
  return parts.slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join("") || "?";
}

function RowActions() {
  return (
    <div className="flex shrink-0 gap-2">
      <Button type="button" className={cn(SMALL_BTN, "bg-brand-ink hover:bg-brand-ink/90")}>
        <Pencil className="size-3.5" /> Edit
      </Button>
      <Button type="button" className={cn(SMALL_BTN, "bg-accent-2 hover:bg-accent-2/90")}>
        <Trash2 className="size-3.5" /> Delete
      </Button>
    </div>
  );
}

export function EditUserForm({
  userId,
  role,
  email,
  displayName,
  company,
  profile,
}: {
  userId: string;
  role: Role;
  email: string;
  displayName: string;
  company: { name: string } | null;
  profile: EditableProfile | null;
}) {
  const router = useRouter();
  const [dirty, setDirty] = useState(false);
  const [languages, setLanguages] = useState<string[]>(profile?.languages ?? []);
  const [summary, setSummary] = useState(profile?.summary ?? "");

  const isCandidate = role === "candidate" && profile;

  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      onChange={() => setDirty(true)}
      className="space-y-6 pb-24"
    >
      <ProfileSectionCard
        title="Basic Information"
        subtitle="These details will help employers know who they will be reviewing."
      >
        {isCandidate ? (
          <>
            <div className="flex items-center gap-4 rounded-[12px] bg-brand-container px-5 py-4">
              <Avatar className="size-[60px] after:border-brand-border">
                <AvatarFallback className="bg-brand-surface text-lg font-semibold text-brand-primary">
                  {initialsOf(displayName)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-base font-semibold text-brand-ink">
                  LinkedIn Profile Image
                </p>
                <p className="text-sm text-brand-ink-secondary">
                  Pulled from LinkedIn when available.
                </p>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              <Field label="First Name" required>
                <Input name="firstName" defaultValue={profile.firstName} className={INPUT} maxLength={FIELD_LIMITS.name} />
              </Field>
              <Field label="Middle Name">
                <Input name="middleName" defaultValue={profile.middleName} className={INPUT} maxLength={FIELD_LIMITS.middleName} />
              </Field>
              <Field label="Last Name" required>
                <Input name="lastName" defaultValue={profile.lastName} className={INPUT} maxLength={FIELD_LIMITS.name} />
              </Field>
              <Field label="Suffix">
                <Input name="suffix" defaultValue={profile.suffix} className={INPUT} maxLength={FIELD_LIMITS.suffix} />
              </Field>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              <Field label="Country of Residence" required>
                <Input name="country" defaultValue={profile.country} className={INPUT} maxLength={FIELD_LIMITS.location} />
              </Field>
              <Field label="City" required>
                <Input name="city" defaultValue={profile.city} className={INPUT} maxLength={FIELD_LIMITS.location} />
              </Field>
              <Field label="Nationality" required>
                <Input name="nationality" defaultValue={profile.nationality} className={INPUT} maxLength={FIELD_LIMITS.location} />
              </Field>
              <Field label="Phone">
                <Input name="phone" defaultValue={profile.phone} className={INPUT} maxLength={FIELD_LIMITS.phone} />
              </Field>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              <Field label="LinkedIn URL">
                <Input name="linkedinUrl" defaultValue={profile.linkedinUrl} className={INPUT} maxLength={FIELD_LIMITS.url} />
              </Field>
              <Field label="Expected Salary (PHP / month)">
                <Input name="expectedSalary" type="number" min={0} defaultValue={profile.expectedSalary} className={INPUT} />
              </Field>
              <Field label="Total Years of Experience">
                <Input name="totalYearsExperience" type="number" min={0} defaultValue={profile.totalYearsExperience} className={INPUT} />
              </Field>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-[1fr_2fr]">
              <Field label="Preferred Role">
                <Input name="preferredRole" defaultValue={profile.preferredRole} className={INPUT} maxLength={FIELD_LIMITS.preferredRole} />
              </Field>
              <Field label={`Languages Spoken (Max of ${FIELD_LIMITS.maxLanguages})`}>
                <LanguagesInput
                  value={languages}
                  onChange={(next) => {
                    setLanguages(next);
                    setDirty(true);
                  }}
                  maxLength={FIELD_LIMITS.language}
                  max={FIELD_LIMITS.maxLanguages}
                  className={INPUT}
                />
              </Field>
            </div>
          </>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Email">
              <Input value={email} readOnly className={cn(INPUT, "bg-brand-container")} />
            </Field>
            <Field label="User Role">
              <Input value={role === "business" ? "Business" : "Admin"} readOnly className={cn(INPUT, "bg-brand-container")} />
            </Field>
            {role === "business" ? (
              <Field label="Company Name" required>
                <Input name="companyName" defaultValue={company?.name ?? ""} className={INPUT} />
              </Field>
            ) : null}
          </div>
        )}
      </ProfileSectionCard>

      {isCandidate ? (
        <>
          <ProfileSectionCard
            title="Profile Summary"
            subtitle="Tell us about yourself. A short introduction shown at the top of your profile."
          >
            <Textarea
              name="summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              maxLength={FIELD_LIMITS.summary}
              className="min-h-[110px] resize-y rounded-[8px] border-brand-border bg-brand-surface font-body text-sm text-brand-ink shadow-none"
            />
            <p className="-mt-4 text-right text-sm text-brand-ink-secondary">
              {summary.length}/{FIELD_LIMITS.summary} characters
            </p>
          </ProfileSectionCard>

          <ProfileSectionCard
            title="Resume"
            subtitle="Upload your resume as a PDF or DOCX file (up to 5MB)."
          >
            {profile.resume ? (
              <div className={cn(INSET_PANEL, "flex flex-wrap items-center justify-between gap-4 bg-brand-surface p-5")}>
                <div className="flex min-w-0 items-center gap-4">
                  <FileText className="size-10 shrink-0 text-brand-ink-secondary" strokeWidth={1.25} />
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-brand-ink">{profile.resume.filename}</p>
                    <p className="text-sm text-brand-ink-secondary">
                      {profile.resume.uploadedAt
                        ? `Uploaded on ${formatLongDate(new Date(profile.resume.uploadedAt))}`
                        : "Uploaded"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" disabled className={BTN_INK}>
                    <ExternalLink className="size-4" /> View
                  </Button>
                  <Button type="button" disabled className={BTN_PRIMARY}>
                    <RefreshCw className="size-4" /> Replace
                  </Button>
                  <Button type="button" disabled className={BTN_DANGER}>
                    <Trash2 className="size-4" /> Delete
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-brand-ink-secondary">No resume uploaded.</p>
            )}
          </ProfileSectionCard>

          <ProfileSectionCard>
            <ProfileSectionHeader
              title="Education"
              subtitle="Add your schools, degrees, and fields of study."
              action={
                <Button type="button" className={BTN_PRIMARY}>
                  <Plus className="size-4" /> Add Education
                </Button>
              }
            />
            {profile.educations.length === 0 ? (
              <p className="text-sm text-brand-ink-secondary">No education added.</p>
            ) : (
              <div className="space-y-4">
                {profile.educations.map((e) => (
                  <div key={e.id} className={cn(INSET_PANEL, "flex items-start justify-between gap-4 bg-brand-surface p-5")}>
                    <div className="min-w-0">
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
                        {displayDateRange(e.start, e.end, e.current)}
                      </p>
                    </div>
                    <RowActions />
                  </div>
                ))}
              </div>
            )}
          </ProfileSectionCard>

          <ProfileSectionCard>
            <ProfileSectionHeader
              title="Skills"
              subtitle="Add the skills you have and how many years of experience you have with each."
              action={
                <Button type="button" className={BTN_PRIMARY}>
                  <Plus className="size-4" /> Add Skill
                </Button>
              }
            />
            <div className={cn(INSET_PANEL, "flex min-h-[70px] flex-wrap gap-2 bg-brand-surface p-4")}>
              {profile.skills.length === 0 ? (
                <p className="text-sm text-brand-ink-secondary">No skills added.</p>
              ) : (
                profile.skills.map((s) => (
                  <span
                    key={s.id}
                    className="inline-flex h-[26px] items-center gap-2 rounded-[6px] bg-brand-tertiary px-3 text-sm text-brand-ink"
                  >
                    {s.name}
                    <span className="size-1 rounded-full bg-brand-ink" aria-hidden />
                    {s.years}y
                    <button type="button" aria-label={`Remove ${s.name}`} className="text-brand-ink hover:text-accent-2">
                      <X className="size-3" />
                    </button>
                  </span>
                ))
              )}
            </div>
          </ProfileSectionCard>

          <ProfileSectionCard>
            <ProfileSectionHeader
              title="Work Experience"
              subtitle="Add the professional roles you've held and your key responsibilities."
              action={
                <Button type="button" className={BTN_PRIMARY}>
                  <Plus className="size-4" /> Add Work Experience
                </Button>
              }
            />
            {profile.workExperiences.length === 0 ? (
              <p className="text-sm text-brand-ink-secondary">No work experience added.</p>
            ) : (
              <div className="space-y-4">
                {profile.workExperiences.map((w) => (
                  <div key={w.id} className={cn(INSET_PANEL, "bg-brand-surface p-5")}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-base font-semibold text-brand-ink">{w.position}</p>
                        <p className="text-sm text-brand-ink-secondary">
                          {w.companyName}
                          <span className="mx-2">•</span>
                          {EMPLOYMENT_TYPE_LABELS[w.employmentType]}
                        </p>
                        <p className="text-sm text-brand-ink-secondary">
                          {displayDateRange(w.start, w.end, w.current)}
                        </p>
                      </div>
                      <RowActions />
                    </div>
                    {w.description ? (
                      <p className="mt-4 text-sm leading-5 whitespace-pre-line text-brand-ink">{w.description}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </ProfileSectionCard>

          <ProfileSectionCard>
            <ProfileSectionHeader
              title="Projects"
              subtitle="Add personal, academic, or freelance projects that showcase your skills."
              action={
                <Button type="button" className={BTN_PRIMARY}>
                  <Plus className="size-4" /> Add Project
                </Button>
              }
            />
            {profile.projects.length === 0 ? (
              <p className="text-sm text-brand-ink-secondary">No projects added.</p>
            ) : (
              <div className="space-y-4">
                {profile.projects.map((pr) => (
                  <div key={pr.id} className={cn(INSET_PANEL, "bg-brand-surface p-5")}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-base font-semibold text-brand-ink">{pr.name}</p>
                        {pr.url ? (
                          <p className="text-sm text-brand-ink-secondary">
                            URL:{" "}
                            <a href={pr.url} target="_blank" rel="noreferrer" className="underline">
                              {pr.url}
                            </a>
                          </p>
                        ) : null}
                        <p className="text-sm text-brand-ink-secondary">
                          {displayDateRange(pr.start, pr.end, pr.ongoing)}
                        </p>
                      </div>
                      <RowActions />
                    </div>
                    {pr.description ? (
                      <p className="mt-4 line-clamp-2 text-sm leading-5 text-brand-ink">{pr.description}</p>
                    ) : null}
                    {pr.skills.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {pr.skills.map((s) => (
                          <span key={s} className="rounded-[6px] bg-brand-tertiary px-3 py-0.5 text-xs text-brand-ink">
                            {s}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </ProfileSectionCard>
        </>
      ) : null}

      {dirty ? (
        <div className="fixed right-4 bottom-4 left-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-accent-4 bg-status-pending px-4 py-3 shadow-lg lg:right-14 lg:left-[calc(255px+3.5rem)]">
          <p className="text-sm text-brand-ink">
            You have unsaved changes. Make sure you save them before navigating
            to other pages.
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/admin/users/${userId}`)}
              className="h-9 rounded-[8px] border-brand-border bg-brand-surface px-4 text-sm font-medium text-brand-ink hover:bg-brand-container"
            >
              Discard
            </Button>
            <Button type="submit" className={cn(BTN_PRIMARY, "h-9")}>
              Save Changes
            </Button>
          </div>
        </div>
      ) : null}
    </form>
  );
}
