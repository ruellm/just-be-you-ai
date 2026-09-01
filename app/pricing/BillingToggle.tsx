"use client";

import { cn } from "@/lib/utils";
import type { BillingCycle } from "./content";

const OPTIONS: { key: BillingCycle; label: string }[] = [
  { key: "monthly", label: "Monthly" },
  { key: "yearly", label: "Yearly" },
];

// Monthly / Yearly pill. Governs BOTH the candidate and business sections —
// client state only, no URL param.
export function BillingToggle({
  active,
  onChange,
}: {
  active: BillingCycle;
  onChange: (cycle: BillingCycle) => void;
}) {
  return (
    <div className="flex justify-center">
      <div
        role="group"
        aria-label="Billing period"
        className="inline-flex items-center gap-1 rounded-[12px] border border-brand-border bg-brand-surface p-1"
      >
        {OPTIONS.map((option) => {
          const selected = option.key === active;
          return (
            <button
              key={option.key}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.key)}
              className={cn(
                "rounded-[8px] px-5 py-1.5 text-body transition-colors",
                selected
                  ? "bg-brand-secondary font-semibold text-white"
                  : "font-medium text-brand-ink hover:bg-brand-container"
              )}
            >
              {option.label}
            </button>
          );
        })}
        <span className="mr-1 ml-1 rounded-full bg-tag-1 px-2.5 py-1 text-meta font-medium whitespace-nowrap text-brand-ink">
          Save 10%
        </span>
      </div>
    </div>
  );
}
