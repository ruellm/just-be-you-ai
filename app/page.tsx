import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/Footer";
import { PublicNav } from "@/components/PublicNav";
import { getCurrentDbUser, getDashboardPath } from "@/lib/auth";
import { cn } from "@/lib/utils";

// Homepage v2. Anonymous visitors only — signed-in users are redirected below.
//
// Assets live in /public/home. The SVGs are passed `unoptimized` because the
// Next image optimizer refuses SVG unless `dangerouslyAllowSVG` is enabled
// globally; there is nothing to optimize in an SVG anyway.

// No demo-booking flow exists, so both "demo"/"sales" CTAs point at /contact.
const DEMO_HREF = "/contact";

const AUDIENCE_CARDS = [
  {
    title: "I'm a Candidate",
    icon: "/home/icon-candidate-card.svg",
    iconWidth: 231,
    iconHeight: 194,
    body: "Accelerate your career with AI-driven growth. Take interviews, get feedback, and practice your way to your dream role with confidence.",
    cta: { label: "Create Your Profile", href: "/signup" },
  },
  {
    title: "I have a Business",
    icon: "/home/icon-business-card.svg",
    iconWidth: 167,
    iconHeight: 194,
    body: "Scale your recruitment with AI. Create job postings, get recommendations and match with top talents. Reduce time-to-hire by 60%.",
    cta: { label: "Talk to our Sales Specialist", href: DEMO_HREF },
  },
] as const;

// NOTE: blocks 1 and 4 quote plan prices that also live on /pricing
// (CANDIDATE_PRO_PRICE and BUSINESS_PLANS in app/pricing/content.ts). Two
// places to update if pricing changes — see the report.
const FEATURES: {
  image: string;
  pill: string;
  heading: string;
  body: ReactNode;
}[] = [
  {
    image: "/home/feature-1.png",
    pill: "for candidates",
    heading: "Instant Pass/Fail Status & Fast Retakes",
    body: (
      <>
        Complete live AI interviews on demand. Free users get instant pass/fail
        results, while upgrading to{" "}
        <strong className="font-semibold">Professional ($27.99/mo)</strong> cuts
        retake wait times down to just 3 days so you can try again faster.
      </>
    ),
  },
  {
    image: "/home/feature-2.png",
    pill: "for candidates",
    heading: "In-Depth Scoring & Company Access",
    body: "Unlock full performance scores, actionable insights in a dedicated remarks section, and direct access to hiring company details as soon as you pass your interview.",
  },
  {
    image: "/home/feature-3.png",
    pill: "for candidates & businesses",
    heading: "Bias-Free, Skill-First Screening",
    body: "Your identities remain anonymous. We eliminate hiring bias by concealing personal details like age and background until businesses review objective scores and choose to reveal full candidate information.",
  },
  {
    image: "/home/feature-4.png",
    pill: "for businesses",
    heading: "AI-assisted Recommendations",
    body: (
      <>
        Let AI surface your highest-potential candidates automatically. Leverage
        intelligent recommendations, advanced scoring, and automated outreach
        flows on{" "}
        <strong className="font-semibold">Professional ($329/mo)</strong> to
        engage top talent instantly.
      </>
    ),
  },
];

// Rendered as three columns so the designer's column order survives; on
// smaller screens the columns collapse and the list reads top to bottom.
const INDUSTRY_COLUMNS = [
  ["Technology", "Banking & Finance", "Business Process", "Marketing"],
  ["Real Estate", "Media & Entertainment", "Logistics", "Manufacturing"],
  ["Healthcare", "Legal & Compliance", "Retail & E-Commerce", "And many more.."],
] as const;

const HOW_IT_WORKS = [
  {
    title: "For Candidates",
    icon: "/home/icon-candidate-steps.svg",
    tone: "light" as const,
    steps: [
      "Take AI-powered mock interviews with anonymous companies to showcase your true potential.",
      "Your personal data (gender, age, education) is fully anonymized to prevent unconscious bias.",
      "Your identity is only revealed if a business chooses to unlock your profile after your interview.",
    ],
  },
  {
    title: "For Businesses",
    icon: "/home/icon-business-steps.svg",
    tone: "dark" as const,
    steps: [
      "Review candidate skills and AI interview results without seeing identifying demographics.",
      "Use your seats or credits to reveal the full profile of candidates who meet your technical bar.",
      "Connect with top talent based purely on merit and performance data.",
    ],
  },
];

// Short accent underline used under the section headings.
function AccentRule({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("mx-auto h-1 w-16 rounded-full bg-brand-secondary", className)}
    />
  );
}

export default async function HomePage() {
  // If already signed in, skip the landing page. Force a pending password
  // change first; otherwise go straight to the role-based dashboard.
  const dbUser = await getCurrentDbUser();
  if (dbUser) {
    if (dbUser.requiresPasswordChange) redirect("/change-password");
    redirect(getDashboardPath(dbUser.role));
  }

  return (
    <div className="flex min-h-screen flex-col bg-brand-surface font-body text-brand-ink">
      <PublicNav />

      <main className="flex-1">
        {/* ── 1. Hero ─────────────────────────────────────────────────── */}
        {/* section-t (top padding only) + a block-level image: the people
            illustration must sit flush on the purple divider that opens the
            next section, so nothing may add space below it here. */}
        <section className="bg-brand-surface">
          <div className="mx-auto max-w-6xl section-x section-t text-center">
            <h1 className="font-display text-display font-semibold text-brand-ink">
              Experience the Future of Recruitment.{" "}
              <span className="text-brand-secondary">Just Be You.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-[848px] text-subheading text-brand-ink-secondary">
              Save time on first-round interviews. Screen applicants, find top
              talent, and hire the right people faster with AI that works right
              away.
            </p>
            <Button
              asChild
              className="mt-8 h-[42px] rounded-[12px] bg-brand-secondary px-6 text-body font-semibold text-white hover:bg-brand-secondary/90 sm:min-w-[235px]"
            >
              <Link href={DEMO_HREF}>Click here for a free demo</Link>
            </Button>
            <Image
              src="/home/people.svg"
              alt=""
              width={914}
              height={363}
              priority
              unoptimized
              className="mx-auto mt-12 block h-auto w-full max-w-[914px]"
            />
          </div>
        </section>

        {/* ── 2. Audience cards over the photo band ───────────────────── */}
        <section>
          <div aria-hidden className="h-[41px] bg-brand-secondary" />
          <div className="relative isolate">
            <Image
              src="/home/hero-bg.png"
              alt=""
              fill
              sizes="100vw"
              className="-z-10 object-cover"
            />
            <div className="mx-auto grid max-w-6xl grid-cols-1 items-stretch justify-items-center gap-8 section-x section-y md:grid-cols-2">
              {AUDIENCE_CARDS.map((card) => (
                <div
                  key={card.title}
                  className="flex w-full min-w-0 max-w-[420px] flex-col items-center gap-5 rounded-[8px] border-2 border-brand-border bg-brand-surface card-pad text-center"
                >
                  <Image
                    src={card.icon}
                    alt=""
                    width={card.iconWidth}
                    height={card.iconHeight}
                    unoptimized
                    className="h-[120px] w-auto"
                  />
                  <h2 className="text-heading font-semibold text-brand-ink">
                    {card.title}
                  </h2>
                  <p className="text-body text-brand-ink">{card.body}</p>
                  <Button
                    asChild
                    className="mt-auto h-[46px] rounded-[12px] bg-brand-secondary px-6 text-body font-semibold text-white hover:bg-brand-secondary/90"
                  >
                    <Link href={card.cta.href}>{card.cta.label}</Link>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 3. Key Features ─────────────────────────────────────────── */}
        <section className="bg-brand-surface">
          <div className="mx-auto max-w-6xl section-x section-y">
            <div className="space-y-4 text-center">
              <h2 className="font-display text-page-title font-semibold text-brand-secondary">
                Key Features
              </h2>
              <p className="mx-auto max-w-3xl text-subheading text-brand-ink-secondary">
                Skip the long waits and manual screening. Candidates land roles
                faster while hiring teams find top talent in half the time.
              </p>
            </div>

            <div className="mt-12 space-y-12 sm:mt-16 sm:space-y-16">
              {FEATURES.map((feature, index) => {
                const flipped = index % 2 === 1;
                return (
                  <div
                    key={feature.heading}
                    className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-12"
                  >
                    <div className={cn("min-w-0", flipped && "lg:order-2")}>
                      <div className="rounded-[8px] bg-tag-2 p-4">
                        <div className="relative aspect-16/10 overflow-hidden rounded-[6px]">
                          <Image
                            src={feature.image}
                            alt=""
                            fill
                            sizes="(min-width: 1024px) 50vw, 100vw"
                            className="object-cover object-top"
                          />
                        </div>
                      </div>
                    </div>
                    <div
                      className={cn(
                        "min-w-0 space-y-4",
                        flipped && "lg:order-1"
                      )}
                    >
                      <span className="font-display inline-flex h-7 items-center rounded-[8px] bg-brand-tertiary px-3 text-meta font-medium tracking-[1.2px] text-brand-ink-secondary uppercase">
                        {feature.pill}
                      </span>
                      <h3 className="text-section font-semibold text-brand-primary">
                        {feature.heading}
                      </h3>
                      <p className="max-w-[647px] text-subheading text-brand-ink-secondary">
                        {feature.body}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── 4. Built for Every Industry ─────────────────────────────── */}
        <section className="bg-brand-primary">
          <div className="mx-auto max-w-6xl section-x section-y">
            <div className="space-y-4 text-center">
              <h2 className="font-display text-page-title font-semibold text-white">
                Built for Every Industry
              </h2>
              {/* brand-tertiary, not brand-secondary: the usual accent is
                  near-invisible against brand-primary. */}
              <AccentRule className="bg-brand-tertiary" />
            </div>
            <div className="mt-10 grid grid-cols-1 gap-x-8 sm:mt-12 sm:grid-cols-2 lg:grid-cols-3">
              {INDUSTRY_COLUMNS.map((column) => (
                <ul key={column[0]} className="min-w-0 space-y-5">
                  {column.map((industry) => (
                    <li
                      key={industry}
                      className="flex items-center gap-3 text-subheading font-semibold text-white"
                    >
                      <Image
                        src="/home/check.svg"
                        alt=""
                        width={30}
                        height={30}
                        unoptimized
                        className="size-[37px] shrink-0"
                      />
                      <span className="min-w-0">{industry}</span>
                    </li>
                  ))}
                </ul>
              ))}
            </div>
          </div>
        </section>

        {/* ── 5. How It Works ─────────────────────────────────────────── */}
        <section className="bg-brand-canvas">
          <div className="mx-auto max-w-6xl section-x section-y">
            <div className="space-y-4 text-center">
              <h2 className="font-display text-page-title font-semibold text-brand-ink">
                How It Works
              </h2>
              <AccentRule />
            </div>
            <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-2">
              {HOW_IT_WORKS.map((card) => {
                const dark = card.tone === "dark";
                return (
                  <div
                    key={card.title}
                    className={cn(
                      "flex min-w-0 flex-col gap-6 rounded-[12px] card-pad",
                      dark
                        ? "bg-brand-primary"
                        : "border border-brand-border bg-brand-surface"
                    )}
                  >
                    <div
                      className={cn(
                        "flex size-16 shrink-0 items-center justify-center rounded-[8px]",
                        dark ? "bg-white/10" : "bg-brand-secondary/10"
                      )}
                    >
                      <Image
                        src={card.icon}
                        alt=""
                        width={32}
                        height={32}
                        unoptimized
                        className="size-8"
                      />
                    </div>
                    <h3
                      className={cn(
                        "text-heading font-semibold",
                        dark ? "text-white" : "text-brand-ink"
                      )}
                    >
                      {card.title}
                    </h3>
                    <ol className="space-y-4">
                      {card.steps.map((step, index) => (
                        <li key={step} className="flex gap-4">
                          <span
                            className={cn(
                              "shrink-0 text-subheading font-semibold",
                              dark ? "text-brand-tertiary" : "text-brand-primary"
                            )}
                          >
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <span
                            className={cn(
                              "min-w-0 text-subheading",
                              dark ? "text-white" : "text-brand-ink-secondary"
                            )}
                          >
                            {step}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── 6. Bottom CTA ───────────────────────────────────────────── */}
        <section className="bg-brand-canvas">
          <div className="mx-auto max-w-6xl section-x pb-10 sm:pb-20">
            <div className="space-y-5 rounded-[12px] bg-tag-2 card-pad text-center">
              <h2 className="text-section font-bold text-white">
                Ready to find your match?
              </h2>
              <p className="mx-auto max-w-[965px] text-subheading text-white">
                Join the growing community of candidates discovering their dream
                roles through empathetic AI matching.
              </p>
              <Button
                asChild
                className="h-[46px] rounded-[12px] bg-brand-secondary px-6 text-body font-semibold text-white hover:bg-brand-secondary/90"
              >
                <Link href="/signup">Create Your Profile</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
