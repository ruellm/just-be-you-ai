"use client";

import { cn } from "@/lib/utils";
import { type Audience, pricingHref } from "./content";

const OPTIONS: { key: Audience; label: string }[] = [
  { key: "candidates", label: "Candidates" },
  { key: "businesses", label: "Businesses" },
];

export function AudienceToggle({
  active,
  onChange,
}: {
  active: Audience;
  onChange: (audience: Audience) => void;
}) {
  return (
    <div className="flex justify-center">
      <div
        role="tablist"
        aria-label="Pricing audience"
        className="inline-flex items-center gap-1 rounded-[12px] border border-brand-border bg-brand-surface p-1"
      >
        {OPTIONS.map((option) => {
          const selected = option.key === active;
          return (
            <a
              key={option.key}
              role="tab"
              aria-selected={selected}
              href={pricingHref(option.key)}
              onClick={(event) => {
                event.preventDefault();
                onChange(option.key);
              }}
              className={cn(
                "rounded-[8px] px-6 py-1.5 text-small font-semibold transition-colors",
                selected
                  ? "bg-brand-secondary text-white"
                  : "text-brand-ink hover:bg-brand-container"
              )}
            >
              {option.label}
            </a>
          );
        })}
      </div>
    </div>
  );
}
