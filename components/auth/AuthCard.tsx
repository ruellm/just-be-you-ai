"use client";

import type { ComponentProps, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// Shared shell for the v2 /login and /signup cards: Candidate/Business tab
// strip, centred title + sub-line, and the field/button styling both pages use.
// Purely presentational — every page decides for itself which controls run a
// real action and which only toast.

export type AuthAudience = "candidate" | "business";

const TABS: { key: AuthAudience; label: string }[] = [
  { key: "candidate", label: "Candidate" },
  { key: "business", label: "Business" },
];

export const AUTH_LABEL =
  "text-small font-normal tracking-[0.6px] text-brand-ink-secondary uppercase";
export const AUTH_INPUT =
  "h-11 rounded-[4px] border-brand-border bg-brand-surface pr-11 text-small text-brand-ink";
export const AUTH_PRIMARY_BUTTON =
  "h-11 w-full rounded-[4px] bg-brand-secondary text-body font-semibold text-white hover:bg-brand-secondary/90";
// The Google button is an outline: white fill, brand-primary border + label.
export const AUTH_GOOGLE_BUTTON =
  "h-11 rounded-[4px] border-brand-primary bg-brand-surface text-body font-semibold text-brand-primary hover:bg-brand-primary/5";
export const AUTH_LINK = "font-semibold text-brand-secondary hover:underline";

export function AuthCard({
  active,
  onChange,
  title,
  subtitle,
  children,
}: {
  active: AuthAudience;
  onChange: (audience: AuthAudience) => void;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="w-full min-w-0 max-w-[460px] overflow-hidden rounded-[8px] border border-brand-border bg-brand-surface shadow-sm">
      <div role="tablist" aria-label="Account type" className="grid grid-cols-2">
        {TABS.map((tab) => {
          const selected = tab.key === active;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onChange(tab.key)}
              className={cn(
                "min-w-0 border-b-2 px-4 py-3.5 text-body transition-colors",
                selected
                  ? "border-brand-secondary font-semibold text-brand-secondary"
                  : "border-brand-border font-medium text-brand-ink-secondary hover:bg-brand-container"
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="space-y-5 card-pad sm:p-8">
        <div className="space-y-2 text-center">
          <h1 className="text-heading font-semibold text-brand-ink">{title}</h1>
          <p className="text-body text-brand-ink-secondary">{subtitle}</p>
        </div>
        {children}
      </div>
    </div>
  );
}

// Label + input with an optional trailing lucide icon.
export function AuthField({
  id,
  label,
  icon: Icon,
  labelAction,
  className,
  ...props
}: ComponentProps<typeof Input> & {
  id: string;
  label: string;
  icon?: LucideIcon;
  /** Rendered right-aligned on the label row (e.g. "Forgot Password?"). */
  labelAction?: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id} className={AUTH_LABEL}>
          {label}
        </Label>
        {labelAction}
      </div>
      <div className="relative">
        <Input id={id} className={cn(AUTH_INPUT, className)} {...props} />
        {Icon ? (
          <Icon
            aria-hidden
            className="pointer-events-none absolute top-1/2 right-3.5 size-5 -translate-y-1/2 text-brand-ink-secondary/70"
          />
        ) : null}
      </div>
    </div>
  );
}

export function AuthTextarea({
  id,
  label,
  className,
  ...props
}: ComponentProps<typeof Textarea> & { id: string; label: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className={AUTH_LABEL}>
        {label}
      </Label>
      <Textarea
        id={id}
        className={cn(
          "min-h-[110px] rounded-[4px] border-brand-border bg-brand-surface text-small text-brand-ink",
          className
        )}
        {...props}
      />
    </div>
  );
}

export function AuthDivider() {
  return (
    <div className="relative">
      <div aria-hidden className="absolute inset-0 flex items-center">
        <span className="w-full border-t border-brand-border" />
      </div>
      <div className="relative flex justify-center">
        <span className="bg-brand-surface px-3 text-small text-brand-ink-secondary">
          or
        </span>
      </div>
    </div>
  );
}

export function AuthFooterNote({ children }: { children: ReactNode }) {
  return (
    <p className="text-center text-small text-brand-ink-secondary">{children}</p>
  );
}
