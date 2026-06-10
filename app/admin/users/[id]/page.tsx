import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RoleBadge } from "@/components/admin/RoleBadge";

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function Field({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
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
          _count: {
            select: {
              skills: true,
              educations: true,
              workExperiences: true,
              applications: true,
            },
          },
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

  const profile = user.candidateProfile;
  const candidateName = profile
    ? [profile.firstName, profile.lastName].filter(Boolean).join(" ")
    : "";

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-8">
      <Link
        href="/admin/users"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="size-4" /> Back to users
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {user.email} <RoleBadge role={user.role} />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4">
            <Field label="Email" value={user.email} />
            <Field label="Joined" value={formatDate(user.createdAt)} />
          </dl>
        </CardContent>
      </Card>

      {user.role === "candidate" && profile ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Candidate profile</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4">
              <Field label="Name" value={candidateName || "—"} />
              <Field
                label="Location"
                value={
                  [profile.city, profile.country].filter(Boolean).join(", ") ||
                  "—"
                }
              />
              <Field label="Preferred role" value={profile.preferredRole || "—"} />
              <Field
                label="Years of experience"
                value={profile.totalYearsExperience ?? "—"}
              />
              <Field label="Skills" value={profile._count.skills} />
              <Field label="Education entries" value={profile._count.educations} />
              <Field
                label="Work experiences"
                value={profile._count.workExperiences}
              />
              <Field label="Applications" value={profile._count.applications} />
              <Field
                label="Resume"
                value={profile.resumeUrl ? "Uploaded" : "Not uploaded"}
              />
            </dl>
          </CardContent>
        </Card>
      ) : null}

      {user.role === "business" && user.company ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Company</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4">
              <Field label="Company name" value={user.company.name || "—"} />
              <Field label="Jobs posted" value={user.company._count.jobs} />
              <Field label="Total applicants" value={applicantCount} />
            </dl>
            <Link
              href={`/admin/companies/${user.company.id}`}
              className="text-muted-foreground hover:text-foreground mt-4 inline-block text-sm underline"
            >
              View company detail
            </Link>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
