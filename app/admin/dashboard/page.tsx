import Link from "next/link";
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

export default async function AdminDashboardPage() {
  const [
    candidates,
    businesses,
    admins,
    companies,
    jobs,
    applications,
    passed,
    recentUsers,
    recentJobs,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "candidate" } }),
    prisma.user.count({ where: { role: "business" } }),
    prisma.user.count({ where: { role: "admin" } }),
    prisma.company.count(),
    prisma.job.count(),
    prisma.application.count(),
    prisma.application.count({ where: { status: "passed" } }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, email: true, role: true, createdAt: true },
    }),
    prisma.job.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        createdAt: true,
        company: { select: { name: true } },
      },
    }),
  ]);

  const stats = [
    { label: "Candidates", value: candidates },
    { label: "Businesses", value: businesses },
    { label: "Admins", value: admins },
    { label: "Companies", value: companies },
    { label: "Jobs", value: jobs },
    { label: "Applications", value: applications },
    { label: "Passed candidates", value: passed },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      <h1 className="text-2xl font-semibold">Admin dashboard</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent>
              <p className="text-2xl font-semibold">{s.value}</p>
              <p className="text-muted-foreground text-sm">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent signups</CardTitle>
          </CardHeader>
          <CardContent>
            {recentUsers.length === 0 ? (
              <p className="text-muted-foreground text-sm">No users yet.</p>
            ) : (
              <div className="divide-y">
                {recentUsers.map((u) => (
                  <Link
                    key={u.id}
                    href={`/admin/users/${u.id}`}
                    className="hover:bg-muted/40 -mx-2 flex items-center justify-between gap-2 rounded-md px-2 py-2"
                  >
                    <span className="truncate text-sm">{u.email}</span>
                    <span className="flex shrink-0 items-center gap-2">
                      <RoleBadge role={u.role} />
                      <span className="text-muted-foreground text-xs">
                        {formatDate(u.createdAt)}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent jobs</CardTitle>
          </CardHeader>
          <CardContent>
            {recentJobs.length === 0 ? (
              <p className="text-muted-foreground text-sm">No jobs yet.</p>
            ) : (
              <div className="divide-y">
                {recentJobs.map((j) => (
                  <div
                    key={j.id}
                    className="flex items-center justify-between gap-2 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{j.title}</p>
                      <p className="text-muted-foreground truncate text-xs">
                        {j.company.name}
                      </p>
                    </div>
                    <span className="text-muted-foreground shrink-0 text-xs">
                      {formatDate(j.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
