import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { applicationPath } from "@/lib/applications";
import {
  LEVEL_LABELS,
  WORK_MODE_LABELS,
  companyInitial,
  formatSalary,
  postedAgo,
} from "@/lib/jobs";
import { ApplyButton } from "./ApplyButton";

function Section({ title, body }: { title: string; body: string | null }) {
  if (!body) return null;
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-muted-foreground text-sm whitespace-pre-line">{body}</p>
    </section>
  );
}

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const job = await prisma.job.findUnique({
    where: { id },
    include: { company: true, skills: { include: { skill: true } } },
  });
  if (!job) notFound();

  const salary = formatSalary(job.salaryMin, job.salaryMax);
  const closed = job.status === "closed";

  // Application state for the current candidate (drives the CTA).
  const user = await getCurrentUser();
  const profile = user
    ? await prisma.candidateProfile.findUnique({
        where: { userId: user.id },
        select: { id: true },
      })
    : null;
  const existing = profile
    ? await prisma.application.findUnique({
        where: {
          candidateProfileId_jobId: {
            candidateProfileId: profile.id,
            jobId: job.id,
          },
        },
        select: { id: true, status: true },
      })
    : null;

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Link
        href="/candidate/jobs"
        className="text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="size-4" /> Back to jobs
      </Link>

      {closed ? (
        <div className="border-destructive/40 bg-destructive/10 text-destructive mb-6 rounded-md border px-4 py-3 text-sm">
          This job is no longer accepting applications.
        </div>
      ) : null}

      {/* Hero */}
      <div className="mb-8 space-y-4">
        <div className="flex items-start gap-4">
          {job.company.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={job.company.logoUrl}
              alt=""
              className="size-12 shrink-0 rounded-md object-cover"
            />
          ) : (
            <div className="bg-muted text-muted-foreground flex size-12 shrink-0 items-center justify-center rounded-md font-semibold">
              {companyInitial(job.company.name)}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold">{job.title}</h1>
            <p className="text-muted-foreground">{job.company.name}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline">{WORK_MODE_LABELS[job.workMode]}</Badge>
          {job.location ? (
            <Badge variant="outline">{job.location}</Badge>
          ) : null}
          <Badge variant="secondary">{LEVEL_LABELS[job.level]} level</Badge>
        </div>

        {salary ? <p className="font-medium">{salary}</p> : null}
        <p className="text-muted-foreground text-xs">{postedAgo(job.createdAt)}</p>

        {closed ? (
          <Button size="lg" disabled>
            Apply
          </Button>
        ) : !profile ? (
          <div className="space-y-2">
            <Button size="lg" disabled>
              Apply
            </Button>
            <p className="text-muted-foreground text-sm">
              Complete your{" "}
              <Link
                href="/candidate/profile/basic-info"
                className="underline"
              >
                basic info
              </Link>{" "}
              before applying.
            </p>
          </div>
        ) : existing ? (
          <Button asChild size="lg" variant="outline">
            <Link href={applicationPath(existing.id, existing.status)}>
              {existing.status === "submitted"
                ? "Continue your interview"
                : "View your result"}
            </Link>
          </Button>
        ) : (
          <ApplyButton jobId={job.id} />
        )}
      </div>

      <div className="space-y-8">
        <Section title="Job description" body={job.description} />
        <Section title="Role overview" body={job.roleOverview} />
        <Section title="What does day-to-day look like" body={job.dayToDay} />
        <Section title="Requirements" body={job.requirements} />

        {job.skills.length > 0 ? (
          <section className="space-y-2">
            <h2 className="text-lg font-semibold">Required skills</h2>
            <div className="flex flex-wrap gap-1.5">
              {job.skills.map((s) => (
                <Badge key={s.skillId} variant="secondary">
                  {s.skill.name}
                </Badge>
              ))}
            </div>
          </section>
        ) : null}

        <Card>
          <CardContent className="text-muted-foreground text-sm">
            <p className="text-foreground mb-1 font-medium">
              Evaluation process
            </p>
            After you apply, you&apos;ll complete a short AI interview. Results
            are shared with {job.company.name} along with your profile.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
