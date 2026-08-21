import Link from "next/link";

// Candidates/Businesses switcher shared by the two pricing pages. The
// active audience renders as a filled pill; the other links to its page.
const OPTIONS = [
  { key: "candidates", label: "Candidates", href: "/pricing" },
  { key: "businesses", label: "Businesses", href: "/pricing/businesses" },
] as const;

export function AudienceToggle({
  active,
}: {
  active: (typeof OPTIONS)[number]["key"];
}) {
  return (
    <div className="flex justify-center">
      <div className="inline-flex items-center gap-1 rounded-[12px] border border-brand-border bg-brand-surface p-1">
        {OPTIONS.map((option) =>
          option.key === active ? (
            <span
              key={option.key}
              className="rounded-[8px] bg-brand-secondary px-6 py-1.5 text-small font-semibold text-white"
            >
              {option.label}
            </span>
          ) : (
            <Link
              key={option.key}
              href={option.href}
              className="rounded-[8px] px-6 py-1.5 text-small font-semibold text-brand-ink transition-colors hover:bg-brand-container"
            >
              {option.label}
            </Link>
          ),
        )}
      </div>
    </div>
  );
}
