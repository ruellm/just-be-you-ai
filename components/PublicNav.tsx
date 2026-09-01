"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const LINKS = [
  { label: "Pricing", href: "/pricing" },
  { label: "Contact", href: "/contact" },
  { label: "Sign In", href: "/login" },
] as const;

// No demo-booking flow exists — "Book a Demo" points at /contact.
// The design's 155px width is a desktop measurement; alongside the wordmark and
// the hamburger it overflows a 320px viewport, so the mobile instance sizes to
// its label instead.
const CTA_CLASS =
  "h-[41px] rounded-[12px] bg-brand-secondary text-white hover:bg-brand-secondary/90";
const CTA_DESKTOP_CLASS = "min-w-[155px]";
const CTA_HREF = "/contact";
const CTA_LABEL = "Book a Demo";

export function PublicNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-brand-border bg-brand-surface font-body">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 section-x md:h-20">
        <Link
          href="/"
          className="shrink-0 text-xl font-semibold whitespace-nowrap text-brand-primary md:text-2xl"
        >
          Just Be You.
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={pathname === link.href ? "page" : undefined}
              className={cn(
                "text-sm transition-colors hover:text-brand-primary",
                pathname === link.href
                  ? "font-semibold text-brand-secondary"
                  : "font-normal text-brand-ink"
              )}
            >
              {link.label}
            </Link>
          ))}
          <Button asChild className={cn(CTA_CLASS, CTA_DESKTOP_CLASS)}>
            <Link href={CTA_HREF}>{CTA_LABEL}</Link>
          </Button>
        </nav>

        <div className="flex shrink-0 items-center gap-1 md:hidden">
          <Button asChild className={CTA_CLASS}>
            <Link href={CTA_HREF}>{CTA_LABEL}</Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="text-brand-ink"
          >
            {open ? <X /> : <Menu />}
          </Button>
        </div>
      </div>

      {open ? (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
          className="fixed inset-x-0 top-16 bottom-0 z-30 bg-brand-ink/40 md:hidden"
        />
      ) : null}

      <nav
        aria-label="Mobile"
        className={cn(
          "fixed top-16 right-0 bottom-0 z-40 flex w-[255px] flex-col gap-1 border-l border-brand-border bg-brand-surface p-4 transition-transform duration-200 md:hidden",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={() => setOpen(false)}
            aria-current={pathname === link.href ? "page" : undefined}
            className={cn(
              "flex h-12 items-center rounded-[8px] px-4 text-small transition-colors hover:bg-brand-container",
              pathname === link.href
                ? "font-semibold text-brand-secondary"
                : "font-normal text-brand-ink"
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
