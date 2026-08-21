import Link from "next/link";
import { Plus } from "lucide-react";
import { Prisma, type Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { userDisplayName } from "@/lib/admin";
import { formatLongDate } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DateField,
  SearchField,
  SelectField,
} from "@/components/data-table/FilterFields";
import {
  dayRangeFrom,
  firstParam as first,
  PAGE_SIZE,
  TableCard,
  TD_CLASS,
  TH_CLASS,
  TR_CLASS,
} from "@/components/data-table/TableCard";
import { UserRowActions } from "./UserRowActions";

const ROLES: Role[] = ["candidate", "business", "admin"];

const ROLE_LABELS: Record<Role, string> = {
  candidate: "Candidate",
  business: "Business",
  admin: "Admin",
};

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const q = first(sp.q).trim();
  const dateStr = first(sp.date).trim();
  const roleParam = first(sp.role);
  const role = ROLES.includes(roleParam as Role) ? (roleParam as Role) : null;
  const page = Math.max(1, Number.parseInt(first(sp.page), 10) || 1);
  const dayRange = dayRangeFrom(dateStr);

  const where: Prisma.UserWhereInput = {
    ...(role ? { role } : {}),
    ...(dayRange ? { createdAt: dayRange } : {}),
    ...(q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" } },
            {
              candidateProfile: {
                OR: [
                  { firstName: { contains: q, mode: "insensitive" } },
                  { lastName: { contains: q, mode: "insensitive" } },
                ],
              },
            },
            { company: { name: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        candidateProfile: { select: { firstName: true, lastName: true } },
        company: { select: { id: true, name: true } },
      },
    }),
  ]);

  function pageHref(target: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (dateStr) params.set("date", dateStr);
    if (role) params.set("role", role);
    if (target > 1) params.set("page", String(target));
    const query = params.toString();
    return `/admin/users${query ? `?${query}` : ""}`;
  }

  return (
    <div className="space-y-6 px-6 py-8 font-body lg:px-14">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-brand-border pb-5">
        <div>
          <h1 className="text-page-title font-semibold tracking-[-0.5px] text-brand-primary">
            List of Accounts
          </h1>
          <p className="mt-3 text-body text-brand-ink-secondary">
            Manage registered account holders, adjust user roles, and monitor
            active account statuses.
          </p>
        </div>
        <Button
          asChild
          className="h-[35px] rounded-[8px] bg-brand-secondary px-4 text-small font-semibold text-white hover:bg-brand-secondary/90"
        >
          <Link href="/admin/users/new">
            <Plus className="size-5" /> Create User
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <SearchField param="q" placeholder="Search name or email" />
        <DateField param="date" />
        <SelectField
          param="role"
          placeholder="Filter by role"
          clearLabel="All roles"
          options={ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))}
        />
      </div>

      <TableCard
        page={page}
        total={total}
        noun={["account", "accounts"]}
        pageHref={pageHref}
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-brand-border hover:bg-transparent">
                <TableHead className={TH_CLASS}>Name</TableHead>
                <TableHead className={TH_CLASS}>Joined Date</TableHead>
                <TableHead className={TH_CLASS}>Email</TableHead>
                <TableHead className={TH_CLASS}>Role</TableHead>
                <TableHead className={TH_CLASS}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow className={TR_CLASS}>
                  <TableCell
                    colSpan={5}
                    className="px-4 py-10 text-center text-small text-brand-ink-secondary"
                  >
                    No accounts found.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u) => (
                  <TableRow key={u.id} className={TR_CLASS}>
                    <TableCell
                      className={`${TD_CLASS} text-small font-medium text-brand-ink`}
                    >
                      {userDisplayName(u)}
                    </TableCell>
                    <TableCell className={`${TD_CLASS} whitespace-nowrap`}>
                      {formatLongDate(u.createdAt)}
                    </TableCell>
                    <TableCell className={TD_CLASS}>{u.email}</TableCell>
                    <TableCell className={TD_CLASS}>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span>{ROLE_LABELS[u.role]}</span>
                        {u.requiresPasswordChange ? (
                          <Badge
                            variant="outline"
                            className="border-brand-border text-[10px] font-medium text-amber-700"
                          >
                            Pending password change
                          </Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className={TD_CLASS}>
                      <UserRowActions
                        userId={u.id}
                        role={u.role}
                        name={userDisplayName(u)}
                        companyId={u.company?.id ?? null}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </TableCard>
    </div>
  );
}
