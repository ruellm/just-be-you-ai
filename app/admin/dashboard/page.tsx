import Link from "next/link";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { adminProfilePath, userDisplayName } from "@/lib/admin";
import { formatLongDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const ROLE_LABELS: Record<Role, string> = {
  candidate: "Candidate",
  business: "Business",
  admin: "Admin",
};

const FOOTER_BTN =
  "h-8 rounded-[5px] bg-brand-secondary px-4 text-meta font-semibold text-brand-canvas hover:bg-brand-secondary/90";

function ListCard({
  children,
  footer,
}: {
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-[12px] border border-brand-border bg-brand-surface">
      <div className="h-[11px] bg-brand-primary" aria-hidden />
      <div className="flex-1">{children}</div>
      <div className="flex justify-center border-t border-brand-border px-4 py-4">
        {footer}
      </div>
    </div>
  );
}

function ListRow({
  title,
  subtitle,
  date,
  href,
}: {
  title: string;
  subtitle: string;
  date: Date;
  href?: string;
}) {
  const inner = (
    <>
      <div className="min-w-0">
        <p className="truncate text-small font-semibold text-brand-ink">{title}</p>
        <p className="truncate text-meta text-brand-ink-secondary">{subtitle}</p>
      </div>
      <span className="shrink-0 text-right text-meta font-medium text-brand-ink-secondary">
        {formatLongDate(date)}
      </span>
    </>
  );
  const cls =
    "flex items-center justify-between gap-4 border-b border-brand-border px-6 py-3 last:border-b-0";
  return href ? (
    <Link href={href} className={cn(cls, "transition-colors hover:bg-brand-canvas/60")}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

export default async function AdminDashboardPage() {
  const [
    candidates,
    companies,
    jobs,
    applications,
    passed,
    recentUsers,
    recentJobs,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "candidate" } }),
    prisma.company.count(),
    prisma.job.count(),
    prisma.application.count(),
    prisma.application.count({ where: { status: "passed" } }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        candidateProfile: { select: { firstName: true, lastName: true } },
        company: { select: { id: true, name: true } },
      },
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
    { label: "Companies", value: companies },
    { label: "Jobs", value: jobs },
    { label: "Applications", value: applications },
    { label: "Passed Candidates", value: passed },
  ];

  return (
    <div className="space-y-8 px-6 py-8 font-body lg:px-14">
      <div>
        <h1 className="text-page-title font-semibold tracking-[-0.5px] text-brand-primary">
          Admin Dashboard
        </h1>
        <p className="mt-3 text-body text-brand-ink-secondary">
          Overview of key platform metrics, total active users, and recent
          system activity.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex min-h-[129px] flex-col items-center justify-center gap-2 rounded-[20px] border border-brand-border bg-brand-surface px-4 py-6 text-center"
          >
            <p className="font-display text-display font-bold text-brand-primary">
              {stat.value}
            </p>
            <p className="text-small text-brand-ink-secondary">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4">
          <h2 className="text-heading font-semibold text-brand-primary">
            Recent Signups
          </h2>
          <ListCard
            footer={
              <Button asChild className={FOOTER_BTN}>
                <Link href="/admin/users">View All Accounts</Link>
              </Button>
            }
          >
            {recentUsers.length === 0 ? (
              <p className="px-6 py-6 text-small text-brand-ink-secondary">
                No users yet.
              </p>
            ) : (
              recentUsers.map((u) => (
                <ListRow
                  key={u.id}
                  href={adminProfilePath({
                    id: u.id,
                    role: u.role,
                    companyId: u.company?.id ?? null,
                  })}
                  title={userDisplayName(u)}
                  subtitle={ROLE_LABELS[u.role]}
                  date={u.createdAt}
                />
              ))
            )}
          </ListCard>
        </section>

        <section className="space-y-4">
          <h2 className="text-heading font-semibold text-brand-primary">
            Recent Job Postings
          </h2>
          <ListCard
            footer={
              <Button asChild className={FOOTER_BTN}>
                <Link href="/admin/companies">View All Companies</Link>
              </Button>
            }
          >
            {recentJobs.length === 0 ? (
              <p className="px-6 py-6 text-small text-brand-ink-secondary">
                No jobs yet.
              </p>
            ) : (
              recentJobs.map((j) => (
                <ListRow
                  key={j.id}
                  title={j.title}
                  subtitle={j.company.name}
                  date={j.createdAt}
                />
              ))
            )}
          </ListCard>
        </section>
      </div>
    </div>
  );
}
