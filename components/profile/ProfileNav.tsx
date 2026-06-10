"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { label: "Basic Info", href: "/candidate/profile/basic-info" },
  { label: "Resume", href: "/candidate/profile/resume" },
  { label: "Profile Summary", href: "/candidate/profile/summary" },
  { label: "Education", href: "/candidate/profile/education" },
  { label: "Skills", href: "/candidate/profile/skills" },
  { label: "Work Experience", href: "/candidate/profile/work-experience" },
  { label: "Projects", href: "/candidate/profile/projects" },
];

export function ProfileNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Profile sections"
      // Horizontal scrolling tab strip on mobile; vertical list on desktop.
      className="flex gap-1 overflow-x-auto border-b pb-2 sm:flex-col sm:overflow-visible sm:border-b-0 sm:pb-0"
    >
      {SECTIONS.map((section) => {
        const active = pathname === section.href;
        return (
          <Link
            key={section.href}
            href={section.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
              active
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            )}
          >
            {section.label}
          </Link>
        );
      })}
    </nav>
  );
}
