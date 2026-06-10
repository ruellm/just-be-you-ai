import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { StatusBadge, TierBadge } from "@/components/applications/Badges";
import { applicationPath } from "@/lib/applications";

type ProfileFields = {
  firstName: string | null;
  lastName: string | null;
  country: string | null;
  city: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  expectedSalary: number | null;
  nationality: string | null;
  languages: string[];
  totalYearsExperience: number | null;
  preferredRole: string | null;
  summary: string | null;
  resumeUrl: string | null;
};

// Completion = percent of profile signals filled in: the basic-info fields +
// summary, plus "has at least one" education / skill / work experience.
function completionPercent(
  profile: ProfileFields | null,
  counts: { education: number; skills: number; workExperience: number }
): number {
  if (!profile) return 0;
  const checks: boolean[] = [
    !!profile.firstName,
    !!profile.lastName,
    !!profile.country,
    !!profile.city,
    !!profile.phone,
    !!profile.linkedinUrl,
    profile.expectedSalary != null,
    !!profile.nationality,
    profile.languages.length > 0,
    profile.totalYearsExperience != null,
    !!profile.preferredRole,
    !!profile.summary,
    !!profile.resumeUrl,
    counts.education > 0,
    counts.skills > 0,
    counts.workExperience > 0,
  ];
  const filled = checks.filter(Boolean).length;
  return Math.round((filled / checks.length) * 100);
}

export default async function CandidateDashboardPage() {
  const user = await getCurrentUser();
  const profile = user
    ? await prisma.candidateProfile.findUnique({ where: { userId: user.id } })
    : null;

  const counts = profile
    ? {
        education: await prisma.education.count({
          where: { candidateProfileId: profile.id },
        }),
        skills: await prisma.candidateSkill.count({
          where: { candidateProfileId: profile.id },
        }),
        workExperience: await prisma.workExperience.count({
          where: { candidateProfileId: profile.id },
        }),
      }
    : { education: 0, skills: 0, workExperience: 0 };

  const percent = completionPercent(profile, counts);

  const recentApplications = profile
    ? await prisma.application.findMany({
        where: { candidateProfileId: profile.id },
        orderBy: { createdAt: "desc" },
        take: 3,
        include: {
          job: { select: { title: true, company: { select: { name: true } } } },
          interviewResult: { select: { tier: true } },
        },
      })
    : [];

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-8">
      <h1 className="text-2xl font-semibold">Welcome, {user?.email}</h1>

      <Card>
        <CardHeader>
          <CardTitle>Your profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/candidate/profile/basic-info">
                Complete your profile
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/candidate/jobs">Browse jobs</Link>
            </Button>
          </div>
          <p className="text-muted-foreground text-sm">
            Profile completion: {percent}%
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Recent applications</CardTitle>
          <Link
            href="/candidate/applications"
            className="text-muted-foreground hover:text-foreground text-sm"
          >
            View all
          </Link>
        </CardHeader>
        <CardContent>
          {recentApplications.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No applications yet.{" "}
              <Link href="/candidate/jobs" className="underline">
                Browse jobs
              </Link>
              .
            </p>
          ) : (
            <div className="divide-y">
              {recentApplications.map((app) => (
                <Link
                  key={app.id}
                  href={applicationPath(app.id, app.status)}
                  className="hover:bg-muted/40 -mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {app.job.title}
                    </p>
                    <p className="text-muted-foreground truncate text-xs">
                      {app.job.company.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {app.interviewResult ? (
                      <TierBadge tier={app.interviewResult.tier} />
                    ) : null}
                    <StatusBadge status={app.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
