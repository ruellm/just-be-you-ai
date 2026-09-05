import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Business table shell (dashboard + jobs): white card, brand border, 12px
// radius, an 11px brand-primary bar across the top, and a footer with the
// "Showing N of M" line + numbered pagination. Server component.

export const PAGE_SIZE = 10;

export function firstParam(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

// `YYYY-MM-DD` (native date input) → that calendar day as a UTC range.
export function dayRangeFrom(dateStr: string): { gte: Date; lt: Date } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const start = new Date(`${dateStr}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime())) return null;
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { gte: start, lt: end };
}

// Page numbers to render: always 1 and last, a window of ±1 around the
// current page, and "…" for any gap. e.g. 1 … 4 5 6 … 12
function pageItems(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const keep = new Set([1, total, current - 1, current, current + 1]);
  const items: (number | "…")[] = [];
  for (let p = 1; p <= total; p++) {
    if (keep.has(p)) items.push(p);
    else if (items[items.length - 1] !== "…") items.push("…");
  }
  return items;
}

const pageBtn =
  "inline-flex h-[26px] min-w-[24px] items-center justify-center rounded-[8px] border px-1.5 text-meta font-medium transition-colors";
const pageBtnIdle =
  "border-brand-border bg-brand-canvas text-brand-ink-secondary hover:bg-brand-container";
const pageBtnActive =
  "border-brand-secondary bg-brand-secondary text-brand-canvas";

export function TableCard({
  children,
  page,
  pageSize = PAGE_SIZE,
  total,
  noun,
  pageHref,
}: {
  children: ReactNode;
  page: number;
  pageSize?: number;
  total: number;
  noun: [singular: string, plural: string];
  pageHref: (page: number) => string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <div className="overflow-hidden rounded-[12px] border border-brand-border bg-brand-surface">
      {/* Design detail: solid brand bar across the top of the card. */}
      <div className="h-[11px] bg-brand-primary" aria-hidden />

      {children}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-brand-border px-4 py-3">
        <p className="text-meta text-brand-ink-secondary">
          Showing {from}
          {to !== from ? `–${to}` : ""} of {total}{" "}
          {total === 1 ? noun[0] : noun[1]}
        </p>
        {totalPages > 1 ? (
          <nav aria-label="Pagination" className="flex flex-wrap items-center gap-1.5">
            {pageItems(page, totalPages).map((item, i) =>
              item === "…" ? (
                <span key={`gap-${i}`} className="px-1 text-meta text-brand-ink-secondary">
                  …
                </span>
              ) : item === page ? (
                <span
                  key={item}
                  aria-current="page"
                  className={cn(pageBtn, pageBtnActive)}
                >
                  {item}
                </span>
              ) : (
                <Link key={item} href={pageHref(item)} className={cn(pageBtn, pageBtnIdle)}>
                  {item}
                </Link>
              )
            )}
            {page < totalPages ? (
              <Link
                href={pageHref(page + 1)}
                className={cn(pageBtn, pageBtnIdle, "min-w-[56px] px-3")}
              >
                Next
              </Link>
            ) : null}
          </nav>
        ) : null}
      </div>
    </div>
  );
}

// Header/body cell classes shared by both tables.
export const TH_CLASS =
  "h-12 px-4 text-small font-semibold whitespace-nowrap text-brand-ink";
// Body rows only (headers use their own class): even rows carry a 10%
// brand-secondary tint so long lists scan more easily.
export const TR_CLASS =
  "border-brand-border text-meta font-medium text-brand-ink-secondary even:bg-brand-secondary/10 hover:bg-brand-canvas/60";
export const TD_CLASS = "px-4 py-3";
// Small action button (24px, 5px radius, 12px semibold, canvas text).
export const ACTION_BTN =
  "h-6 rounded-[5px] px-3 text-meta font-semibold text-brand-canvas";
