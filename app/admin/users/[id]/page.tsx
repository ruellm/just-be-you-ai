import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { getInterviewSeatBalance } from "@/lib/interview-seats";
import { userDisplayName } from "@/lib/admin";
import { formatLongDate } from "@/lib/dates";
import { displayAvatarUrl } from "@/lib/profile-format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RoleBadge } from "@/components/admin/RoleBadge";
import {
  BTN_INK,
  BTN_PRIMARY,
  INSET_PANEL,
  ProfileSectionCard,
} from "@/app/candidate/profile/ProfileSectionCard";
import {
  ADMIN_CANDIDATE_INCLUDE,
  AdminProfileHeader,
  CandidateProfileSections,
  SectionTitle,
} from "@/components/admin/CandidateProfileSections";
import { UserHeaderActions } from "./UserHeaderActions";

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
        include: { ...ADMIN_CANDIDATE_INCLUDE, _count: { select: { applications: true } } },
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
          select: { id: true, createdAt: true, job: { select: { title: true } } },
        })
      : [];

  const profile = user.candidateProfile;
  const avatarUrl = displayAvatarUrl(
    profile?.profileImageUrl,
    profile?.avatarUrl
  );
  const seatBalance =
    user.role === "candidate" && profile
      ? await getInterviewSeatBalance(prisma, profile.id)
      : null;
  const name = userDisplayName(user);

  return (
    <div className="space-y-6 px-6 py-8 font-body lg:px-14">
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-2 text-subheading font-semibold tracking-[-0.5px] text-brand-primary hover:underline"
      >
        <ArrowLeft className="size-5" /> Back to Previous
      </Link>

      <AdminProfileHeader
        name={name}
        email={user.email}
        avatarUrl={avatarUrl}
        badges={
          <>
            <RoleBadge role={user.role} />
            {user.requiresPasswordChange ? (
              <Badge
                variant="outline"
                className="border-brand-border text-[10px] font-medium text-amber-700"
              >
                Pending password change
              </Badge>
            ) : null}
          </>
        }
        actions={
          <UserHeaderActions
            userId={user.id}
            name={name}
            role={user.role}
            candidateProfileId={profile?.id ?? null}
            candidateTier={profile?.tier ?? null}
            companyId={user.company?.id ?? null}
            seatsUsed={seatBalance?.used ?? 0}
            seatsTotal={seatBalance?.total ?? 0}
          />
        }
      />

      {/* Basic Information for business/admin only — candidates get theirs
          from the shared CandidateProfileSections below. */}
      {user.role === "candidate" && profile ? null : (
        <ProfileSectionCard>
          <SectionTitle>Basic Information</SectionTitle>
          <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Email" value={user.email} />
            <Field
              label="Role"
              value={user.role === "business" ? "Business" : "Admin"}
            />
            <Field label="Joined Date" value={formatLongDate(user.createdAt)} />
            {user.role === "business" && user.company ? (
              <>
                <Field label="Company Name" value={user.company.name} />
                <Field label="Jobs Posted" value={user.company._count.jobs} />
                <Field label="Total Applicants" value={applicantCount} />
              </>
            ) : null}
          </dl>
          {user.role === "business" && user.company ? (
            <Button asChild className={BTN_INK}>
              <Link href={`/admin/companies/${user.company.id}`}>
                View Company Detail
              </Link>
            </Button>
          ) : null}
        </ProfileSectionCard>
      )}

      {user.role === "candidate" && profile ? (
        <>
          {/* Sections 2-8 come from the shared component so this page and
              /admin/applications/[id] cannot drift apart. */}
          <CandidateProfileSections profile={profile} joinedAt={user.createdAt} />

          {profile.parsedResumeText ? (
            <details className="rounded-[12px] border border-brand-border bg-brand-surface">
              <summary className="cursor-pointer px-6 py-4 text-small font-medium text-brand-ink-secondary">
                Parsed resume text ({profile.parsedResumeText.length} chars) — debug
              </summary>
              <pre className="max-h-96 overflow-auto border-t border-brand-border px-6 py-4 font-mono text-meta whitespace-pre-wrap text-brand-ink-secondary">
                {profile.parsedResumeText}
              </pre>
            </details>
          ) : null}

          <ProfileSectionCard>
            <SectionTitle>Application History</SectionTitle>
            {candidateApplications.length === 0 ? (
              <p className="text-small text-brand-ink-secondary">
                No applications yet.
              </p>
            ) : (
              <div className="space-y-4">
                {candidateApplications.map((app) => (
                  <div
                    key={app.id}
                    className={cn(
                      INSET_PANEL,
                      "flex flex-wrap items-center justify-between gap-4 bg-brand-surface p-5"
                    )}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-body font-semibold text-brand-ink">
                        {app.job.title}
                      </p>
                      <p className="text-small text-brand-ink-secondary">
                        Applied on {formatLongDate(app.createdAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button asChild className={BTN_PRIMARY}>
                        <Link href={`/admin/applications/${app.id}`}>
                          View Results
                        </Link>
                      </Button>
                      <Button asChild className={BTN_INK}>
                        <Link href={`/admin/applications/${app.id}/questions`}>
                          View Generated Questions
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ProfileSectionCard>
        </>
      ) : null}
    </div>
  );
}
