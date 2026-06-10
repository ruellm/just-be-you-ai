import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LEVEL_LABELS,
  WORK_MODE_LABELS,
  companyInitial,
  formatSalary,
  postedAgo,
} from "@/lib/jobs";

export type JobCardData = Prisma.JobGetPayload<{
  include: { company: true; skills: { include: { skill: true } } };
}>;

export function JobCard({ job }: { job: JobCardData }) {
  const salary = formatSalary(job.salaryMin, job.salaryMax);
  const skills = job.skills.map((s) => s.skill.name);
  const shownSkills = skills.slice(0, 3);
  const extraSkills = skills.length - shownSkills.length;

  return (
    <Card className="transition-colors hover:border-foreground/20">
      <CardHeader className="space-y-3">
        <div className="flex items-start gap-3">
          {job.company.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={job.company.logoUrl}
              alt=""
              className="size-10 shrink-0 rounded-md object-cover"
            />
          ) : (
            <div className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-md text-sm font-semibold">
              {companyInitial(job.company.name)}
            </div>
          )}
          <div className="min-w-0">
            <Link
              href={`/candidate/jobs/${job.id}`}
              className="font-semibold hover:underline"
            >
              {job.title}
            </Link>
            <p className="text-muted-foreground text-sm">{job.company.name}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline">{WORK_MODE_LABELS[job.workMode]}</Badge>
          {job.location ? (
            <Badge variant="outline">{job.location}</Badge>
          ) : null}
          <Badge variant="secondary">{LEVEL_LABELS[job.level]}</Badge>
          {job.status === "closed" ? (
            <Badge variant="destructive">Closed</Badge>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {salary ? <p className="text-sm font-medium">{salary}</p> : null}

        {shownSkills.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {shownSkills.map((name) => (
              <Badge key={name} variant="secondary" className="font-normal">
                {name}
              </Badge>
            ))}
            {extraSkills > 0 ? (
              <Badge variant="secondary" className="font-normal">
                +{extraSkills} more
              </Badge>
            ) : null}
          </div>
        ) : null}

        <p className="text-muted-foreground text-xs">
          {postedAgo(job.createdAt)}
        </p>
      </CardContent>
    </Card>
  );
}
