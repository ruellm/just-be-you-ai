import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Shared visual bits for the single-page profile.

// Inset panel used for resume / education rows / skill chips inside a card.
export const INSET_PANEL =
  "rounded-[12px] border border-brand-border bg-brand-container";

// Section button system: 35px, rounded-[8px], white 14px semibold + icon.
const BTN_BASE =
  "h-[35px] rounded-[8px] px-4 font-body text-small font-semibold text-white";
export const BTN_PRIMARY = cn(
  BTN_BASE,
  "bg-brand-secondary hover:bg-brand-secondary/90"
);
export const BTN_INK = cn(BTN_BASE, "bg-brand-ink hover:bg-brand-ink/90");
export const BTN_DANGER = cn(BTN_BASE, "bg-accent-2 hover:bg-accent-2/90");

// Heading + sub-line (+ optional right-aligned action, e.g. "Add Education").
export function ProfileSectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-1">
        <h2 className="font-body text-heading font-semibold text-brand-primary">
          {title}
        </h2>
        <p className="font-body text-small text-brand-ink-secondary">{subtitle}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

// One stacked section card: heading + sub-line + content. When a section
// component renders its own header (to put a dialog-trigger button in it),
// omit title/subtitle here. Pure markup — usable from server and client.
export function ProfileSectionCard({
  title,
  subtitle,
  children,
  className,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "space-y-6 rounded-[12px] border border-brand-border bg-brand-surface p-6 sm:p-8",
        className
      )}
    >
      {title && subtitle ? (
        <ProfileSectionHeader title={title} subtitle={subtitle} />
      ) : null}
      {children}
    </section>
  );
}
