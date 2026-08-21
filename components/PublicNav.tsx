"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const LINKS = [
  { label: "Pricing", href: "/pricing" },
  { label: "Contact", href: "/contact" },
  { label: "Log In", href: "/login" },
] as const;

const CTA_CLASS =
  "rounded-[12px] bg-brand-secondary text-white hover:bg-brand-secondary/90";

export function PublicNav() {
  const [open, setOpen] = useState(false);

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
              className="text-sm font-semibold text-brand-ink-secondary transition-colors hover:text-brand-primary"
            >
              {link.label}
            </Link>
          ))}
          <Button asChild className={CTA_CLASS}>
            <Link href="/signup">Get Started</Link>
          </Button>
        </nav>

        <div className="flex shrink-0 items-center gap-1 md:hidden">
          <Button asChild className={CTA_CLASS}>
            <Link href="/signup">Get Started</Link>
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
            className="flex h-12 items-center rounded-[8px] px-4 text-body font-medium text-brand-ink-sidebar transition-colors hover:bg-brand-container"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
