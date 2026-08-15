import Link from "next/link";
import { Button } from "@/components/ui/button";

// Shared nav for the public marketing pages (homepage, pricing, ...).
// The logged-in app keeps AppNav — this is only for anonymous-facing pages.
// NOTE: /contact doesn't exist yet — it 404s until that page is built.
export function PublicNav() {
  return (
    <header className="border-b border-brand-border bg-brand-surface font-body">
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between gap-4 px-6">
        <Link href="/" className="text-2xl font-semibold text-brand-primary">
          Just Be You.
        </Link>
        <nav className="flex items-center gap-3 sm:gap-6">
          <Link
            href="/pricing"
            className="text-sm font-semibold text-brand-ink-secondary transition-colors hover:text-brand-primary"
          >
            Pricing
          </Link>
          <Link
            href="/contact"
            className="text-sm font-semibold text-brand-ink-secondary transition-colors hover:text-brand-primary"
          >
            Contact
          </Link>
          <Link
            href="/login"
            className="text-sm font-semibold text-brand-ink-secondary transition-colors hover:text-brand-primary"
          >
            Log In
          </Link>
          <Button
            asChild
            className="rounded-[12px] bg-brand-secondary text-white hover:bg-brand-secondary/90"
          >
            <Link href="/signup">Get Started</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
