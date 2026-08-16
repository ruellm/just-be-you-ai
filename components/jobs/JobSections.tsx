import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Job-detail building blocks shared by the candidate job page and the
// business job page (same design). Pure markup — server-safe.

// Full-width content card. `tone="container"` = the Evaluation Process
// variant (brand-container background instead of white).
export function SectionCard({
  title,
  tone = "surface",
  children,
}: {
  title: string;
  tone?: "surface" | "container";
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        "space-y-4 rounded-[12px] border border-brand-border p-6 sm:p-8",
        tone === "container" ? "bg-brand-container" : "bg-brand-surface"
      )}
    >
      <h2 className="text-2xl font-semibold text-brand-primary">{title}</h2>
      {children}
    </section>
  );
}

// Text sections are free-form Strings (may or may not contain newlines).
// Multi-line values render as bullets (blank lines skipped); a single line
// stays a paragraph. `bullets` opts a section into the list treatment.
export function TextSection({
  title,
  body,
  bullets = false,
}: {
  title: string;
  body: string | null;
  bullets?: boolean;
}) {
  if (!body) return null;
  const lines = body
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*[-•*]\s+/, "").trim())
    .filter(Boolean);
  const asList = bullets && lines.length > 1;

  return (
    <SectionCard title={title}>
      {asList ? (
        <ul className="list-disc space-y-1.5 pl-5 text-base text-brand-ink">
          {lines.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      ) : (
        <p className="text-base whitespace-pre-line text-brand-ink">{body}</p>
      )}
    </SectionCard>
  );
}

// Dark tag (tag-2) for work mode / location / level in the header.
export function DarkTag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-[23px] items-center rounded-[6px] bg-tag-2 px-2.5 text-xs text-white">
      {children}
    </span>
  );
}

// Light skill chip (tag-1) for the Required Skills section.
export function SkillChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-6 items-center rounded-[6px] bg-tag-1 px-2.5 text-xs text-brand-ink">
      {children}
    </span>
  );
}
