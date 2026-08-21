import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { formatLongDate } from "@/lib/dates";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DateField, SearchField } from "@/components/data-table/FilterFields";
import { CompanyRowActions } from "./CompanyRowActions";
import {
  dayRangeFrom,
  firstParam as first,
  PAGE_SIZE,
  TableCard,
  TD_CLASS,
  TH_CLASS,
  TR_CLASS,
} from "@/components/data-table/TableCard";

export default async function AdminCompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const q = first(sp.q).trim();
  const dateStr = first(sp.date).trim();
  const page = Math.max(1, Number.parseInt(first(sp.page), 10) || 1);
  const dayRange = dayRangeFrom(dateStr);

  const where: Prisma.CompanyWhereInput = {
    ...(dayRange ? { createdAt: dayRange } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { user: { email: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [total, companies] = await Promise.all([
    prisma.company.count({ where }),
    prisma.company.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        user: { select: { email: true } },
        _count: { select: { jobs: true } },
      },
    }),
  ]);

  function pageHref(target: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (dateStr) params.set("date", dateStr);
    if (target > 1) params.set("page", String(target));
    const query = params.toString();
    return `/admin/companies${query ? `?${query}` : ""}`;
  }

  return (
    <div className="space-y-6 px-6 py-8 font-body lg:px-14">
      <div className="border-b border-brand-border pb-5">
        <h1 className="text-page-title font-semibold tracking-[-0.5px] text-brand-primary">
          List of Companies
        </h1>
        <p className="mt-3 text-body text-brand-ink-secondary">
          Browse and manage affiliated company profiles, company details, and
          linked user accounts.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <SearchField param="q" placeholder="Search company name/owner" />
        <DateField param="date" />
      </div>

      <TableCard
        page={page}
        total={total}
        noun={["company", "companies"]}
        pageHref={pageHref}
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-brand-border hover:bg-transparent">
                <TableHead className={TH_CLASS}>Company Name</TableHead>
                <TableHead className={TH_CLASS}>Joined Date</TableHead>
                <TableHead className={TH_CLASS}>Website</TableHead>
                <TableHead className={TH_CLASS}>Jobs</TableHead>
                <TableHead className={TH_CLASS}>Owner</TableHead>
                <TableHead className={TH_CLASS}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.length === 0 ? (
                <TableRow className={TR_CLASS}>
                  <TableCell
                    colSpan={6}
                    className="px-4 py-10 text-center text-small text-brand-ink-secondary"
                  >
                    No companies found.
                  </TableCell>
                </TableRow>
              ) : (
                companies.map((c) => (
                  <TableRow key={c.id} className={TR_CLASS}>
                    <TableCell className={`${TD_CLASS} text-small font-medium text-brand-ink`}>
                      {c.name || "(unnamed)"}
                    </TableCell>
                    <TableCell className={`${TD_CLASS} whitespace-nowrap`}>
                      {formatLongDate(c.createdAt)}
                    </TableCell>
                    <TableCell className={TD_CLASS}>
                      {c.website ? (
                        <a
                          href={c.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          {c.website}
                        </a>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className={TD_CLASS}>{c._count.jobs}</TableCell>
                    <TableCell className={TD_CLASS}>{c.user.email}</TableCell>
                    <TableCell className={TD_CLASS}>
                      <CompanyRowActions
                        companyId={c.id}
                        name={c.name || "(unnamed)"}
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
