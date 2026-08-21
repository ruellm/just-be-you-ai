"use client";

import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Controlled multi-value input: type a language, press Enter (or comma) to add
// it as a chip. Backspace on an empty field removes the last chip. `max` caps
// the number of chips (input disables once reached).
export function LanguagesInput({
  value,
  onChange,
  id,
  placeholder = "Type a language and press Enter",
  maxLength,
  max,
  className,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  id?: string;
  placeholder?: string;
  maxLength?: number;
  max?: number;
  className?: string;
}) {
  const [draft, setDraft] = useState("");
  const full = max != null && value.length >= max;

  function add(raw: string) {
    const next = raw.trim();
    if (!next || full) return;
    if (value.some((v) => v.toLowerCase() === next.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...value, next]);
    setDraft("");
  }

  function removeAt(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(draft);
    } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
      removeAt(value.length - 1);
    }
  }

  return (
    <div className="space-y-2">
      <Input
        id={id}
        value={draft}
        placeholder={full ? `Maximum of ${max} reached` : placeholder}
        maxLength={maxLength}
        disabled={full}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => add(draft)}
        className={className}
      />
      {value.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {value.map((lang, i) => (
            <span
              key={`${lang}-${i}`}
              className={cn(
                "inline-flex h-[26px] items-center gap-1 rounded bg-brand-container pr-1 pl-2.5 font-body text-meta font-medium text-brand-ink"
              )}
            >
              {lang}
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="rounded p-0.5 text-brand-ink-secondary hover:text-brand-ink"
                aria-label={`Remove ${lang}`}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
