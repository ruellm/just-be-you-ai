import Link from "next/link";
import { Plus } from "lucide-react";
import { Prisma, type Role } from "@prisma/client";
import { prisma } from "@/lib/db";
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
import { RoleBadge } from "@/components/admin/RoleBadge";
import { cn } from "@/lib/utils";
import { AdminSearch } from "./AdminSearch";
import { UserRowActions } from "./UserRowActions";

const PAGE_SIZE = 20;

const ROLE_FILTERS: { key: string; label: string; role: Role | null }[] = [
  { key: "all", label: "All", role: null },
  { key: "candidate", label: "Candidate", role: "candidate" },
  { key: "business", label: "Business", role: "business" },
  { key: "admin", label: "Admin", role: "admin" },
];

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const activeRole = ROLE_FILTERS.find((r) => r.key === sp.role) ?? ROLE_FILTERS[0];
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const where: Prisma.UserWhereInput = {};
  if (activeRole.role) where.role = activeRole.role;
  if (q) {
    where.OR = [
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
    ];
  }

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        candidateProfile: { select: { firstName: true, lastName: true } },
        company: { select: { name: true } },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function pageHref(target: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (activeRole.role) params.set("role", activeRole.key);
    if (target > 1) params.set("page", String(target));
    const query = params.toString();
    return `/admin/users${query ? `?${query}` : ""}`;
  }

  function displayName(u: (typeof users)[number]): string {
    const candidateName = [
      u.candidateProfile?.firstName,
      u.candidateProfile?.lastName,
    ]
      .filter(Boolean)
      .join(" ");
    if (candidateName) return candidateName;
    if (u.company?.name) return u.company.name;
    return u.email;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Users</h1>
        <Button asChild>
          <Link href="/admin/users/new">
            <Plus /> Create user
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <AdminSearch placeholder="Search by name or email…" />
        <div className="flex flex-wrap gap-1">
          {ROLE_FILTERS.map((f) => (
            <Link
              key={f.key}
              href={f.role ? `/admin/users?role=${f.key}` : "/admin/users"}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                activeRole.key === f.key
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              {f.label}
            </Link>
          ))}
        </div>
      </div>

      <p className="text-muted-foreground text-sm">
        Showing {users.length} of {total} {total === 1 ? "user" : "users"}
      </p>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground text-center">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    <Link href={`/admin/users/${u.id}`} className="hover:underline">
                      {displayName(u)}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {u.email}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <RoleBadge role={u.role} />
                      {u.requiresPasswordChange ? (
                        <Badge
                          variant="outline"
                          className="text-amber-700 dark:text-amber-300"
                        >
                          Pending password change
                        </Badge>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(u.createdAt)}
                  </TableCell>
                  <TableCell>
                    <UserRowActions userId={u.id} role={u.role} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between">
          {page > 1 ? (
            <Button asChild variant="outline" size="sm">
              <Link href={pageHref(page - 1)}>Previous</Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              Previous
            </Button>
          )}
          <span className="text-muted-foreground text-sm">
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Button asChild variant="outline" size="sm">
              <Link href={pageHref(page + 1)}>Next</Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              Next
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}
