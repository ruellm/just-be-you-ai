import type { Metadata } from "next";
import Link from "next/link";
import { CircleCheck, CircleX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/Footer";
import { PublicNav } from "@/components/PublicNav";
import { AudienceToggle } from "./AudienceToggle";
import { PricingFaq, type FaqItem } from "./PricingFaq";

export const metadata: Metadata = {
  title: "Pricing — Just Be You",
  description:
    "Choose the plan that fits your career stage. Practice, get feedback, and land your dream role with confidence.",
};

const FAQ_ITEMS: FaqItem[] = [
  {
    question: "How does the 1-week wait work on the free plan?",
    answer:
      "If you receive a 'Fail' status on an interview while on the Starter plan, you must wait 7 days before you can retake that specific interview type. Professional users can retake the next day.",
  },
  {
    question: "What is the remarks section about?",
    answer:
      "Professional interviews include a dedicated remarks section: written, role-specific observations from your AI interview — what stood out, and concrete suggestions for improvement — alongside your score and feedback.",
  },
  {
    question: "Can I cancel my Professional subscription anytime?",
    answer:
      "Yes — you can cancel anytime, and you'll keep Professional access until the end of your current billing period. After that, your account moves to the Free plan and your interview history stays intact.",
  },
];

const FREE_FEATURES = [
  { text: "2 seats/Maximum of 2 interviews total", included: true },
  { text: "Simple pass/fail status", included: true },
  { text: "1-week wait on fail", included: true },
  { text: "Detailed feedback", included: false },
  { text: "Next-day retake", included: false },
] as const;

const PRO_FEATURES = [
  "10 seats/Unlimited interviews for chosen roles",
  "Full score & detailed feedback",
  "Next-day retake on fail",
  "Dedicated remarks section",
  "Priority support",
] as const;

export default function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-brand-canvas font-body text-brand-ink">
      <PublicNav />

      <main className="flex-1">
        <div className="mx-auto max-w-6xl section-x section-y">
          {/* Header */}
          <div className="space-y-4 text-center">
            <h1 className="font-display text-page-title font-bold text-brand-primary">
              Invest in Your Potential
            </h1>
            <p className="mx-auto max-w-3xl text-subheading text-brand-ink-secondary">
              Choose the plan that fits your career stage. Practice, get
              feedback, and land your dream role with confidence.
            </p>
          </div>

          <div className="mt-10">
            <AudienceToggle active="candidates" />
          </div>

          {/* Pricing cards */}
          <div className="mx-auto mt-12 grid max-w-4xl gap-8 lg:grid-cols-2">
            {/* Free */}
            <div className="flex flex-col overflow-hidden rounded-[12px] border border-brand-border bg-brand-surface">
              <div aria-hidden className="h-[13px] bg-brand-secondary" />
              <div className="flex flex-1 flex-col stack-gap card-pad">
                <span className="font-display self-start rounded-full bg-tag-1 px-3 py-1 text-meta font-semibold tracking-[1.2px] text-brand-ink-secondary uppercase">
                  Free
                </span>
                <p>
                  <span className="text-price font-semibold text-brand-primary">
                    $0
                  </span>
                  <span className="text-body text-brand-ink-secondary">
                    /forever
                  </span>
                </p>
                <p className="text-small text-brand-ink-secondary">
                  Perfect for exploring the platform and trying out basic
                  features.
                </p>
                <ul className="space-y-3">
                  {FREE_FEATURES.map((feature) => (
                    <li
                      key={feature.text}
                      className="flex items-start gap-2.5 text-small font-medium text-brand-ink-secondary"
                    >
                      {feature.included ? (
                        <CircleCheck className="size-5 shrink-0 text-accent-3" />
                      ) : (
                        <CircleX className="size-5 shrink-0 text-accent-2" />
                      )}
                      {feature.text}
                    </li>
                  ))}
                </ul>
                <Button
                  asChild
                  className="mt-auto h-11 w-full rounded-[12px] bg-brand-secondary text-white hover:bg-brand-secondary/90"
                >
                  <Link href="/signup">Get Started Free</Link>
                </Button>
              </div>
            </div>

            {/* Professional */}
            <div className="flex flex-col overflow-hidden rounded-[12px] bg-brand-primary">
              <div aria-hidden className="h-[13px] bg-brand-tertiary" />
              <div className="flex flex-1 flex-col stack-gap card-pad">
                <div className="flex items-start justify-between gap-4">
                  <span className="font-display rounded-full bg-tag-1 px-3 py-1 text-meta font-semibold tracking-[1.2px] text-brand-ink-secondary uppercase">
                    Professional
                  </span>
                  <span className="text-xs text-status-success">
                    Most Popular!
                  </span>
                </div>
                <p>
                  <span className="text-price font-semibold text-status-success">
                    $12
                  </span>
                  <span className="text-body text-white/80">/month</span>
                </p>
                <p className="text-small text-white">
                  Accelerate your growth with deep insights, more choices, and
                  unlimited interviews.
                </p>
                <ul className="space-y-3">
                  {PRO_FEATURES.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2.5 text-small font-medium text-white"
                    >
                      <CircleCheck className="size-5 shrink-0 text-brand-tertiary" />
                      {feature}
                    </li>
                  ))}
                </ul>
                {/* No billing/upgrade flow exists yet — signup for now */}
                <Button
                  asChild
                  className="mt-auto h-11 w-full rounded-[12px] bg-brand-tertiary text-brand-ink hover:bg-brand-tertiary/90"
                >
                  <Link href="/signup">Upgrade to Professional</Link>
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
                Everything you need to know about our candidate plans.
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
