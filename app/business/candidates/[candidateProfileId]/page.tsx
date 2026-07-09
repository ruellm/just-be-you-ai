import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { candidateAppliedToCompany, getCurrentCompany } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  RecommendationBadge,
  StatusBadge,
  TierBadge,
} from "@/components/applications/Badges";
import { FitEvaluation } from "@/components/applications/FitEvaluation";
import { scoreToPercent } from "@/lib/applications";
import { ViewResumeButton } from "./ViewResumeButton";

function monthRange(start: Date | null, end: Date | null, present: boolean) {
  const s = start ? start.toISOString().slice(0, 7) : "";
  const e = present ? "Present" : end ? end.toISOString().slice(0, 7) : "";
  if (!s && !e) return "";
  return [s, e].filter(Boolean).join(" – ");
}

function Field({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}

export default async function CandidateDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ candidateProfileId: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { candidateProfileId } = await params;
  const { from } = await searchParams;

  const company = await getCurrentCompany();
  if (!company) redirect("/login");

  // Authorization: candidate must have applied to one of this company's jobs.
  const allowed = await candidateAppliedToCompany(company.id, candidateProfileId);
  if (!allowed) notFound();

  const profile = await prisma.candidateProfile.findUnique({
    where: { id: candidateProfileId },
    include: {
      user: { select: { email: true } },
      educations: { orderBy: { startDate: "desc" } },
      skills: { include: { skill: true }, orderBy: { skill: { name: "asc" } } },
      workExperiences: {
        orderBy: { startDate: "desc" },
        include: {
          projects: { include: { skills: { include: { skill: true } } } },
        },
      },
    },
  });
  if (!profile) notFound();

  // This company's applications from this candidate (with results).
  const applications = await prisma.application.findMany({
    where: { candidateProfileId, job: { companyId: company.id } },
    orderBy: { createdAt: "desc" },
    include: { job: { select: { title: true } }, interviewResult: true },
  });

  const fullName =
    [profile.firstName, profile.lastName].filter(Boolean).join(" ") ||
    profile.user.email;
  const location = [profile.city, profile.country].filter(Boolean).join(", ");

  const fromJob =
    typeof from === "string" && from.startsWith("job:") ? from.slice(4) : null;
  const backHref = fromJob ? `/business/jobs/${fromJob}` : "/business/jobs";

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-8">
      <Link
        href={backHref}
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="size-4" /> Back to applicants
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{fullName}</h1>
          <p className="text-muted-foreground text-sm">{profile.user.email}</p>
        </div>
        {profile.resumeUrl ? (
          <ViewResumeButton candidateProfileId={profile.id} />
        ) : null}
      </div>

      {/* Interview results with this company */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Interview results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {applications.map((app) => (
            <div key={app.id} className="rounded-md border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">{app.job.title}</span>
                <StatusBadge status={app.status} />
                {app.interviewResult ? (
                  <>
                    <RecommendationBadge
                      recommendation={app.interviewResult.recommendation}
                    />
                    <TierBadge tier={app.interviewResult.tier} />
                    <span className="text-muted-foreground text-sm">
                      {scoreToPercent(app.interviewResult.score)}%
                    </span>
                  </>
                ) : null}
              </div>
              {app.interviewResult ? (
                <>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Completed{" "}
                    {app.interviewResult.completedAt.toLocaleDateString()}
                  </p>
                  <div className="mt-3">
                    <FitEvaluation
                      fitSummary={app.interviewResult.fitSummary}
                      strengthsJson={app.interviewResult.strengthsJson}
                      concernsJson={app.interviewResult.concernsJson}
                    />
                  </div>
                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm font-medium">
                      View transcript
                    </summary>
                    <p className="text-muted-foreground mt-2 text-sm whitespace-pre-line">
                      {app.interviewResult.transcript}
                    </p>
                  </details>
                </>
              ) : (
                <p className="text-muted-foreground mt-1 text-xs">
                  Interview not completed yet.
                </p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Basic info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Basic information</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4">
            <Field label="Location" value={location || null} />
            <Field label="Phone" value={profile.phone} />
            <Field label="LinkedIn" value={profile.linkedinUrl} />
            <Field label="Nationality" value={profile.nationality} />
            <Field
              label="Expected salary"
              value={
                profile.expectedSalary != null
                  ? `₱${profile.expectedSalary.toLocaleString("en-PH")} / month`
                  : null
              }
            />
            <Field
              label="Years of experience"
              value={
                profile.totalYearsExperience != null
                  ? String(profile.totalYearsExperience)
                  : null
              }
            />
            <Field label="Preferred role" value={profile.preferredRole} />
            <Field
              label="Languages"
              value={
                profile.languages.length ? profile.languages.join(", ") : null
              }
            />
          </dl>
        </CardContent>
      </Card>

      {/* Summary */}
      {profile.summary ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profile summary</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm whitespace-pre-line">
            {profile.summary}
          </CardContent>
        </Card>
      ) : null}

      {/* Skills */}
      {profile.skills.length ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Skills</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1.5">
            {profile.skills.map((s) => (
              <Badge key={s.id} variant="secondary" className="font-normal">
                {s.skill.name} · {s.yearsOfExperience}y
              </Badge>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {/* Education */}
      {profile.educations.length ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Education</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {profile.educations.map((e) => (
              <div key={e.id}>
                <p className="text-sm font-medium">{e.school}</p>
                <p className="text-muted-foreground text-sm">
                  {[e.degree, e.fieldOfStudy].filter(Boolean).join(", ")}
                </p>
                <p className="text-muted-foreground text-xs">
                  {[
                    e.country,
                    monthRange(e.startDate, e.endDate, e.currentlyStudying),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {/* Work experience + projects */}
      {profile.workExperiences.length ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Work experience</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {profile.workExperiences.map((w) => (
              <div key={w.id} className="space-y-2">
                <div>
                  <p className="text-sm font-medium">
                    {w.position} · {w.companyName}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {monthRange(w.startDate, w.endDate, w.currentlyWorking)}
                  </p>
                </div>
                {w.description ? (
                  <p className="text-muted-foreground text-sm whitespace-pre-line">
                    {w.description}
                  </p>
                ) : null}
                {w.projects.length ? (
                  <div className="space-y-2 border-l pl-3">
                    {w.projects.map((p) => (
                      <div key={p.id}>
                        <p className="text-sm font-medium">{p.name}</p>
                        {p.description ? (
                          <p className="text-muted-foreground text-sm">
                            {p.description}
                          </p>
                        ) : null}
                        {p.skills.length ? (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {p.skills.map((ps) => (
                              <Badge
                                key={ps.id}
                                variant="secondary"
                                className="text-xs font-normal"
                              >
                                {ps.skill.name}
                              </Badge>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
