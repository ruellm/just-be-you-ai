import type { Metadata } from "next";
import Link from "next/link";
import { CircleCheck, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/Footer";
import { PublicNav } from "@/components/PublicNav";
import { AudienceToggle } from "../AudienceToggle";
import { PricingFaq, type FaqItem } from "../PricingFaq";

export const metadata: Metadata = {
  title: "Business Pricing — Just Be You",
  description:
    "Allow our AI to match you highly suitable candidates with ease. Choose the tier that fits your hiring volume.",
};

const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'How does the "reveal candidate info" credit system work?',
    answer:
      "By default, candidate profiles are anonymized to reduce bias. When you find a strong match based on skills and experience, you spend 1 seat credit to reveal their full contact details and resume. This ensures you only pay for actionable leads. Credits reset monthly.",
  },
  {
    question: "Can I reassign seats if a recruiter leaves?",
    answer:
      "Yes — seats belong to your company, not to an individual. When a recruiter leaves, an account admin can free up their seat and assign it to another team member.",
  },
  {
    question: "What happens if we need more than 50 seats?",
    answer:
      "That's what our Enterprise tier is for. Reach out through Contact Sales and we'll put together a plan sized to your team and hiring volume.",
  },
];

// Feature rows for the light cards: check = included, info = usage note.
const STARTER_FEATURES = [
  { icon: "check", text: "Unlimited job postings" },
  { icon: "check", text: "Basic AI match filtering" },
  { icon: "info", text: "-1 credit to reveal candidate info" },
] as const;

// NOTE: identical to Starter's list — matches the source design verbatim
// (flagged as a likely oversight for an Enterprise tier).
const ENTERPRISE_FEATURES = STARTER_FEATURES;

const PRO_FEATURES = [
  "Everything in Starter",
  "Advanced AI Scoring",
  "Automated Outreach Flows",
  "Enhanced Support",
] as const;

const SCALE_FEATURES = [
  "Everything in Professional",
  "Custom Analytics",
  "Dedicated ATS Integration",
] as const;

function SeatTag({ label }: { label: string }) {
  return (
    <span className="font-display self-start rounded-full bg-tag-1 px-3 py-1 text-meta font-semibold tracking-[1.2px] text-brand-ink-secondary uppercase">
      {label}
    </span>
  );
}

function LightFeatureList({
  features,
}: {
  features: readonly { icon: "check" | "info"; text: string }[];
}) {
  return (
    <ul className="space-y-3">
      {features.map((feature) => (
        <li
          key={feature.text}
          className="flex items-start gap-2.5 text-small font-medium text-brand-ink-secondary"
        >
          {feature.icon === "check" ? (
            <CircleCheck className="size-5 shrink-0 text-accent-3" />
          ) : (
            <Info className="size-5 shrink-0 text-brand-ink-secondary" />
          )}
          {feature.text}
        </li>
      ))}
    </ul>
  );
}

function DarkFeatureList({ features }: { features: readonly string[] }) {
  return (
    <ul className="space-y-3">
      {features.map((feature) => (
        <li
          key={feature}
          className="flex items-start gap-2.5 text-small font-medium text-white"
        >
          <CircleCheck className="size-5 shrink-0 text-brand-tertiary" />
          {feature}
        </li>
      ))}
    </ul>
  );
}

export default function BusinessPricingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-brand-canvas font-body text-brand-ink">
      <PublicNav />

      <main className="flex-1">
        <div className="mx-auto max-w-6xl section-x section-y">
          {/* Header */}
          <div className="space-y-4 text-center">
            <h1 className="font-display text-page-title font-bold text-brand-primary">
              Scale Your AI Workforce
            </h1>
            <p className="mx-auto max-w-3xl text-subheading text-brand-ink-secondary">
              Allow our AI to match you highly suitable candidates with ease.
              Choose the tier that fits your hiring volume.
            </p>
          </div>

          <div className="mt-10">
            <AudienceToggle active="businesses" />
          </div>

          {/* Pricing cards — bottom-aligned row; tops stagger naturally */}
          <div className="mt-16 grid items-end gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {/* Starter */}
            <div className="flex flex-col overflow-hidden rounded-[12px] border border-brand-border bg-brand-surface">
              <div aria-hidden className="h-[13px] bg-brand-secondary" />
              <div className="flex flex-1 flex-col gap-4 card-pad">
                <SeatTag label="5 Seats" />
                <p className="text-heading font-semibold text-brand-primary">
                  Starter
                </p>
                <p>
                  <span className="text-price font-semibold text-brand-primary">
                    $29
                  </span>
                  <span className="text-body text-brand-primary">/month</span>
                </p>
                <p className="text-small text-brand-ink-secondary">
                  Perfect for small agencies and startups.
                </p>
                <LightFeatureList features={STARTER_FEATURES} />
                <Button
                  asChild
                  className="mt-4 h-11 w-full rounded-[12px] bg-brand-secondary text-white hover:bg-brand-secondary/90"
                >
                  <Link href="/signup">Get Started</Link>
                </Button>
              </div>
            </div>

            {/* Professional */}
            <div className="relative flex flex-col rounded-[12px] bg-brand-primary">
              <span className="font-display absolute -top-9 left-1/2 -translate-x-1/2 rounded-full bg-brand-tertiary px-4 py-1 text-xs font-semibold tracking-[1.2px] whitespace-nowrap text-brand-ink-secondary uppercase">
                Most Popular
              </span>
              <div className="flex flex-1 flex-col gap-4 card-pad">
                <SeatTag label="25 Seats" />
                <p className="text-heading font-semibold text-white">
                  Professional
                </p>
                <p>
                  <span className="text-price font-semibold text-white">
                    $99
                  </span>
                  <span className="text-body text-white">/month</span>
                </p>
                <p className="text-small text-white">
                  Ideal for growing teams with consistent hiring needs.
                </p>
                <DarkFeatureList features={PRO_FEATURES} />
                <Button
                  asChild
                  className="mt-4 h-11 w-full rounded-[12px] bg-brand-tertiary text-brand-ink hover:bg-brand-tertiary/90"
                >
                  <Link href="/signup">Choose Professional</Link>
                </Button>
              </div>
            </div>

            {/* Scale */}
            <div className="flex flex-col rounded-[12px] bg-brand-card">
              <div className="flex flex-1 flex-col gap-4 card-pad">
                <SeatTag label="50 Seats" />
                <p className="text-heading font-semibold text-white">Scale</p>
                <p>
                  <span className="text-price font-semibold text-white">
                    $149
                  </span>
                  <span className="text-body text-white">/month</span>
                </p>
                <p className="text-small text-white">
                  Best for big companies with high-volume recruitments ongoing.
                </p>
                <DarkFeatureList features={SCALE_FEATURES} />
                {/* Figma labels this "Choose Professional" — copy/paste error
                    in the source design; corrected to "Choose Scale". */}
                <Button
                  asChild
                  className="mt-4 h-11 w-full rounded-[12px] bg-brand-tertiary text-brand-ink hover:bg-brand-tertiary/90"
                >
                  <Link href="/signup">Choose Scale</Link>
                </Button>
              </div>
            </div>

            {/* Enterprise */}
            <div className="flex flex-col overflow-hidden rounded-[12px] border border-brand-border bg-brand-surface">
              <div aria-hidden className="h-[13px] bg-brand-secondary" />
              <div className="flex flex-1 flex-col gap-4 card-pad">
                <SeatTag label="50+ Seats" />
                <p className="text-heading font-semibold text-brand-primary">
                  Enterprise
                </p>
                <p className="text-price font-semibold text-brand-primary">
                  Custom Pricing
                </p>
                <p className="text-small text-brand-ink-secondary">
                  We provide tailored solutions for global organizations.
                </p>
                <LightFeatureList features={ENTERPRISE_FEATURES} />
                {/* /contact doesn't exist yet — built in a later session */}
                <Button
                  asChild
                  className="mt-4 h-11 w-full rounded-[12px] bg-brand-secondary text-white hover:bg-brand-secondary/90"
                >
                  <Link href="/contact">Contact Sales</Link>
                </Button>
              </div>
            </div>
          </div>

          {/* FAQ */}
          <div className="mx-auto mt-12 max-w-4xl sm:mt-20">
            <div className="section-gap space-y-4 text-center">
              <h2 className="font-display text-section font-semibold text-brand-primary">
                Frequently Asked Questions
              </h2>
              <div className="mx-auto h-1 w-16 rounded-full bg-brand-secondary" />
              <p className="text-subheading text-brand-ink-secondary">
                Everything you need to know about our business plans.
              </p>
            </div>
            <PricingFaq items={FAQ_ITEMS} />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
