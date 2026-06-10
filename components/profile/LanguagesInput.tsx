"use client";

import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

// Controlled multi-value input: type a language, press Enter (or comma) to add
// it as a chip. Backspace on an empty field removes the last chip.
export function LanguagesInput({
  value,
  onChange,
  id,
  placeholder = "Type a language and press Enter",
}: {
  value: string[];
  onChange: (next: string[]) => void;
  id?: string;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");

  function add(raw: string) {
    const next = raw.trim();
    if (!next) return;
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
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => add(draft)}
      />
      {value.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {value.map((lang, i) => (
            <Badge key={`${lang}-${i}`} variant="secondary" className="gap-1">
              {lang}
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="hover:text-foreground/70 -mr-0.5 ml-0.5"
                aria-label={`Remove ${lang}`}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}
