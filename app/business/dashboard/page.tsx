import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { getCurrentCompany } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge, TierBadge } from "@/components/applications/Badges";
import { scoreToPercent } from "@/lib/applications";

export default async function BusinessDashboardPage() {
  const company = await getCurrentCompany();
  if (!company) redirect("/login");

  const companyJobs = { job: { companyId: company.id } };

  const [totalJobs, totalApplicants, totalPassed, recent] = await Promise.all([
    prisma.job.count({ where: { companyId: company.id } }),
    prisma.application.count({ where: companyJobs }),
    prisma.application.count({ where: { ...companyJobs, status: "passed" } }),
    prisma.application.findMany({
      where: companyJobs,
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        job: { select: { title: true } },
        candidateProfile: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            user: { select: { email: true } },
          },
        },
        interviewResult: { select: { score: true, tier: true } },
      },
    }),
  ]);

  const needsCompanyProfile = !company.name.trim();

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">
            {company.name.trim() || "Your company"}
          </h1>
          <Link
            href="/business/company"
            className="text-muted-foreground hover:text-foreground text-sm"
          >
            Manage company profile
          </Link>
        </div>
        <Button asChild>
          <Link href="/business/jobs/new">
            <Plus /> Post a new job
          </Link>
        </Button>
      </div>

      {needsCompanyProfile ? (
        <Card className="border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <span>Complete your company profile to start posting jobs.</span>
            <Button asChild size="sm" variant="outline">
              <Link href="/business/company">Complete profile</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Jobs posted", value: totalJobs },
          { label: "Total applicants", value: totalApplicants },
          { label: "Passed candidates", value: totalPassed },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent>
              <p className="text-2xl font-semibold">{stat.value}</p>
              <p className="text-muted-foreground text-sm">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent applicants */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Recent applicants</CardTitle>
          <Link
            href="/business/jobs"
            className="text-muted-foreground hover:text-foreground text-sm"
          >
            View jobs
          </Link>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-muted-foreground text-sm">No applicants yet.</p>
          ) : (
            <div className="divide-y">
              {recent.map((app) => {
                const name =
                  [app.candidateProfile.firstName, app.candidateProfile.lastName]
                    .filter(Boolean)
                    .join(" ") || app.candidateProfile.user.email;
                return (
                  <div
                    key={app.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{name}</p>
                      <p className="text-muted-foreground truncate text-xs">
                        {app.job.title}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {app.interviewResult ? (
                        <>
                          <TierBadge tier={app.interviewResult.tier} />
                          <span className="text-muted-foreground text-sm">
                            {scoreToPercent(app.interviewResult.score)}%
                          </span>
                        </>
                      ) : null}
                      <StatusBadge status={app.status} />
                      <Button asChild variant="outline" size="sm">
                        <Link
                          href={`/business/candidates/${app.candidateProfile.id}`}
                        >
                          View profile
                        </Link>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
