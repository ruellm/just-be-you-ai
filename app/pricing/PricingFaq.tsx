"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

// Minimal local-state accordion shared by the pricing pages (no accordion
// primitive is installed and new dependencies are off-limits). One item
// open at a time; first item open by default.
export type FaqItem = {
  question: string;
  answer: string;
};

export function PricingFaq({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="space-y-4">
      {items.map((item, index) => {
        const open = openIndex === index;
        return (
          <div
            key={item.question}
            className="rounded-[12px] border border-brand-border bg-brand-surface"
          >
            <button
              type="button"
              onClick={() => setOpenIndex(open ? null : index)}
              aria-expanded={open}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-body font-semibold text-brand-ink"
            >
              {item.question}
              <ChevronDown
                className={`size-5 shrink-0 text-brand-ink-secondary transition-transform ${
                  open ? "rotate-180" : ""
                }`}
              />
            </button>
            {open ? (
              <p className="px-5 pb-5 text-small text-brand-ink-secondary">
                {item.answer}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
