import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LEVEL_LABELS, WORK_MODE_LABELS } from "@/lib/jobs";

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

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
      jobs: {
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { applications: true } } },
      },
    },
  });
  if (!company) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-8">
      <Link
        href="/admin/companies"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="size-4" /> Back to companies
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {company.name || "(unnamed company)"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {company.description ? (
            <p className="text-muted-foreground whitespace-pre-line">
              {company.description}
            </p>
          ) : null}
          {company.website ? (
            <p>
              <a
                href={company.website}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                {company.website}
              </a>
            </p>
          ) : null}
          <p className="text-muted-foreground">
            Owner: {company.user.email} · Joined{" "}
            {formatDate(company.user.createdAt)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Jobs ({company.jobs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {company.jobs.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No jobs posted yet.
            </p>
          ) : (
            <div className="divide-y">
              {company.jobs.map((job) => (
                <div
                  key={job.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{job.title}</p>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="secondary">
                        {LEVEL_LABELS[job.level]}
                      </Badge>
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
                  </div>
                  <span className="text-muted-foreground text-sm">
                    {job._count.applications}{" "}
                    {job._count.applications === 1 ? "applicant" : "applicants"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
