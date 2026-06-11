import Link from "next/link";
import { redirect } from "next/navigation";
import { Briefcase, Plus } from "lucide-react";
import { getCurrentCompany } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/EmptyState";
import { LEVEL_LABELS, WORK_MODE_LABELS } from "@/lib/jobs";
import { JobStatusToggle } from "./JobStatusToggle";

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function BusinessJobsPage() {
  const company = await getCurrentCompany();
  if (!company) redirect("/login");

  const jobs = await prisma.job.findMany({
    where: { companyId: company.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { applications: true } } },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Jobs</h1>
        <Button asChild>
          <Link href="/business/jobs/new">
            <Plus /> Post a new job
          </Link>
        </Button>
      </div>

      {jobs.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="You haven't posted any jobs yet"
          description="Post your first role to start receiving applicants."
          action={
            <Button asChild>
              <Link href="/business/jobs/new">Post a job</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3">
          {jobs.map((job) => (
            <Card key={job.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0 space-y-2">
                  <Link
                    href={`/business/jobs/${job.id}`}
                    className="font-medium hover:underline"
                  >
                    {job.title}
                  </Link>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="secondary">{LEVEL_LABELS[job.level]}</Badge>
                    <Badge variant="outline">
                      {WORK_MODE_LABELS[job.workMode]}
                    </Badge>
                    <Badge
                      className={
                        job.status === "open"
                          ? "border-transparent bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                          : "border-transparent bg-muted text-muted-foreground"
                      }
                    >
                      {job.status === "open" ? "Open" : "Closed"}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    {job._count.applications}{" "}
                    {job._count.applications === 1 ? "applicant" : "applicants"}{" "}
                    · Posted {formatDate(job.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/business/jobs/${job.id}`}>
                      View applicants
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/business/jobs/${job.id}/edit`}>Edit</Link>
                  </Button>
                  <JobStatusToggle jobId={job.id} status={job.status} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
