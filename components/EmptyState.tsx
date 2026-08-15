import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Shared empty state (brand design): a rounded icon tile, a headline, an
// optional one-liner, and an optional CTA. Used across list pages + profile
// sections for a consistent look.
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-[12px] border border-brand-border bg-brand-surface px-6 py-14 text-center font-body",
        className
      )}
    >
      <div className="flex size-20 items-center justify-center rounded-[20px] bg-brand-container text-brand-primary">
        <Icon className="size-8" />
      </div>
      <div className="space-y-1.5">
        <p className="text-2xl font-semibold text-brand-ink">{title}</p>
        {description ? (
          <p className="mx-auto max-w-sm text-base text-brand-ink-secondary">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}
