import Link from "next/link";

// Site-wide public footer (homepage + marketing pages).
// NOTE: /contact, /privacy, and /terms don't exist yet — those links 404
// until the pages are built.
export function Footer() {
  return (
    <footer className="border-t border-brand-border bg-brand-surface font-body">
      <div className="mx-auto grid max-w-6xl gap-8 section-x py-10 sm:grid-cols-2 sm:gap-10 sm:py-12 lg:grid-cols-5">
        <div className="space-y-2 sm:col-span-2">
          <p className="text-section font-semibold text-brand-primary">
            Just Be You.
          </p>
          <p className="text-small text-brand-ink-secondary">
            Empowering Human Potential.
          </p>
        </div>

        <div className="space-y-3">
          <p className="font-display text-small font-bold tracking-[1.2px] text-brand-primary uppercase">
            Platform
          </p>
          <ul className="space-y-2 text-small text-brand-ink-secondary">
            <li>
              <Link href="/" className="hover:text-brand-primary">
                Home
              </Link>
            </li>
            <li>
              <Link href="/pricing" className="hover:text-brand-primary">
                Pricing
              </Link>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <p className="font-display text-small font-bold tracking-[1.2px] text-brand-primary uppercase">
            Legal
          </p>
          <ul className="space-y-2 text-small text-brand-ink-secondary">
            <li>
              <Link href="/privacy" className="hover:text-brand-primary">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/terms" className="hover:text-brand-primary">
                Terms of Service
              </Link>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <p className="font-display text-small font-bold tracking-[1.2px] text-brand-primary uppercase">
            Connect
          </p>
          <ul className="space-y-2 text-small text-brand-ink-secondary">
            <li>
              <Link href="/contact" className="hover:text-brand-primary">
                Contact Us
              </Link>
            </li>
            <li>
              <a
                href="https://www.linkedin.com/company/one-over-zero-technologies-inc/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-brand-primary"
              >
                LinkedIn
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-brand-border">
        <div className="mx-auto max-w-6xl section-x py-4">
          <p className="text-meta text-brand-ink-sidebar">
            © {new Date().getFullYear()} Just Be You. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
