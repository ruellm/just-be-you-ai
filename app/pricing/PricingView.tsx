"use client";

import { useState } from "react";
import Link from "next/link";
import { CircleCheck, CircleX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BillingToggle } from "./BillingToggle";
import { PricingFaq } from "./PricingFaq";
import {
  type BillingCycle,
  type BusinessPlan,
  BUSINESS_PLANS,
  CANDIDATE_FREE_FEATURES,
  CANDIDATE_PRO_FEATURES,
  CANDIDATE_PRO_PRICE,
  FAQ_ITEMS,
  PAGE_COPY,
} from "./content";

// "Price Cut" (#A0AEC0) from the Figma style sheet — see --color-price-cut.
const PRICE_CUT_CLASS = "text-price-cut";

const CTA_CLASS = "mt-auto h-11 w-full rounded-[12px]";
const CTA_TONE = {
  secondary: "bg-brand-secondary text-white hover:bg-brand-secondary/90",
  tertiary: "bg-brand-tertiary text-brand-ink hover:bg-brand-tertiary/90",
} as const;

function Tag({ label }: { label: string }) {
  return (
    <span className="font-display self-start rounded-full bg-tag-1 px-3 py-1 text-meta font-medium tracking-[1.2px] text-brand-ink-secondary uppercase">
      {label}
    </span>
  );
}

// Struck monthly price + "-10%" chip, shown above the yearly price.
function PriceCut({ monthly }: { monthly: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className={cn("text-heading font-semibold line-through", PRICE_CUT_CLASS)}>
        {monthly}
      </span>
      <span className="rounded-full bg-tag-1 px-2 py-0.5 text-meta font-medium text-brand-ink">
        -10%
      </span>
    </span>
  );
}

function FeatureList({
  features,
  tone,
}: {
  features: readonly string[];
  tone: "light" | "dark";
}) {
  return (
    <ul className="space-y-3">
      {features.map((feature) => (
        <li
          key={feature}
          className={cn(
            "flex items-start gap-2.5 text-small font-medium",
            tone === "light" ? "text-brand-ink-secondary" : "text-white"
          )}
        >
          <CircleCheck
            className={cn(
              "size-[21px] shrink-0",
              tone === "light" ? "text-accent-3" : "text-brand-tertiary"
            )}
          />
          {feature}
        </li>
      ))}
    </ul>
  );
}

// ── For Candidates ──────────────────────────────────────────────────────────

function CandidatePlans({ cycle }: { cycle: BillingCycle }) {
  const yearly = cycle === "yearly";
  return (
    <div className="mx-auto mt-12 grid max-w-4xl grid-cols-1 gap-8 lg:grid-cols-2">
      {/* Free — no yearly variant, always $0 */}
      <div className="flex min-w-0 flex-col overflow-hidden rounded-[12px] border border-brand-border bg-brand-surface">
        <div aria-hidden className="h-[13px] bg-brand-secondary" />
        <div className="flex flex-1 flex-col stack-gap card-pad">
          <Tag label="Free" />
          <p>
            <span className="text-price font-semibold text-brand-primary">$0</span>
            <span className="text-body text-brand-ink-secondary">/forever</span>
          </p>
          <p className="text-small text-brand-ink-secondary">
            Perfect for exploring the platform and trying out basic features.
          </p>
          <ul className="space-y-3">
            {CANDIDATE_FREE_FEATURES.map((feature) => (
              <li
                key={feature.text}
                className="flex items-start gap-2.5 text-small font-medium text-brand-ink-secondary"
              >
                {feature.included ? (
                  <CircleCheck className="size-[21px] shrink-0 text-accent-3" />
                ) : (
                  <CircleX className="size-[21px] shrink-0 text-accent-2" />
                )}
                {feature.text}
              </li>
            ))}
          </ul>
          <Button asChild className={cn(CTA_CLASS, CTA_TONE.secondary)}>
            <Link href="/signup">Get Started Free</Link>
          </Button>
        </div>
      </div>

      {/* Professional */}
      <div className="flex min-w-0 flex-col overflow-hidden rounded-[12px] bg-brand-primary">
        <div aria-hidden className="h-[13px] bg-brand-tertiary" />
        <div className="flex flex-1 flex-col stack-gap card-pad">
          <div className="flex items-start justify-between gap-4">
            <Tag label="Professional" />
            <span className="text-meta text-status-success">Most Popular!</span>
          </div>
          <p className="flex flex-col gap-1">
            {yearly ? <PriceCut monthly={CANDIDATE_PRO_PRICE.monthly} /> : null}
            <span>
              <span className="text-price font-semibold text-white">
                {yearly ? CANDIDATE_PRO_PRICE.yearly : CANDIDATE_PRO_PRICE.monthly}
              </span>
              <span className="text-body text-status-success">/month</span>
            </span>
          </p>
          <p className="text-small text-white">
            Accelerate your growth with deep insights, more choices, and
            unlimited interviews.
          </p>
          <FeatureList features={CANDIDATE_PRO_FEATURES} tone="dark" />
          <Button asChild className={cn(CTA_CLASS, CTA_TONE.tertiary)}>
            <Link href="/signup">Upgrade to Professional</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── For Businesses ──────────────────────────────────────────────────────────

function BusinessCard({
  plan,
  cycle,
}: {
  plan: BusinessPlan;
  cycle: BillingCycle;
}) {
  const light = plan.variant === "light";
  const yearly = cycle === "yearly";
  const card = (
    <div
      className={cn(
        "flex min-w-0 flex-col rounded-[12px]",
        plan.variant === "light" &&
          "overflow-hidden border border-brand-border bg-brand-surface",
        plan.variant === "primary" && "overflow-hidden bg-brand-primary",
        plan.variant === "card" && "bg-brand-card"
      )}
    >
      {plan.variant !== "card" ? (
        <div
          aria-hidden
          className={cn(
            "h-[13px]",
            light ? "bg-brand-secondary" : "bg-brand-tertiary"
          )}
        />
      ) : null}
      <div className="flex flex-1 flex-col gap-4 card-pad">
        <Tag label={plan.seats} />
        <p
          className={cn(
            "text-heading font-semibold",
            light ? "text-brand-primary" : "text-white"
          )}
        >
          {plan.name}
        </p>
        {plan.price ? (
          <p className="flex flex-col gap-1">
            {yearly ? <PriceCut monthly={plan.price.monthly} /> : null}
            <span>
              <span
                className={cn(
                  "text-price font-semibold",
                  light ? "text-brand-primary" : "text-white"
                )}
              >
                {yearly ? plan.price.yearly : plan.price.monthly}
              </span>
              <span
                className={cn(
                  "text-body",
                  light ? "text-brand-primary" : "text-white"
                )}
              >
                /month
              </span>
            </span>
          </p>
        ) : (
          <p
            className={cn(
              "text-price font-semibold",
              light ? "text-brand-primary" : "text-white"
            )}
          >
            {plan.priceLabel}
          </p>
        )}
        <p
          className={cn(
            "text-small",
            light ? "text-brand-ink-secondary" : "text-white"
          )}
        >
          {plan.blurb}
        </p>
        <FeatureList features={plan.features} tone={light ? "light" : "dark"} />
        <Button
          asChild
          className={cn(CTA_CLASS, "mt-4", CTA_TONE[plan.cta.tone])}
        >
          <Link href={plan.cta.href}>{plan.cta.label}</Link>
        </Button>
      </div>
    </div>
  );

  if (!plan.mostPopular) return card;
  // Badge floats ABOVE the card; the wrapper is the grid item so items-end
  // still bottom-aligns the cards themselves.
  return (
    <div className="flex min-w-0 flex-col">
      <div className="flex justify-center pb-3">
        <span className="font-display rounded-full bg-brand-tertiary px-4 py-1 text-meta font-semibold tracking-[1.2px] whitespace-nowrap text-brand-ink-secondary uppercase">
          Most Popular
        </span>
      </div>
      {card}
    </div>
  );
}

function BusinessPlans({ cycle }: { cycle: BillingCycle }) {
  return (
    <div className="mt-12 grid grid-cols-1 items-end gap-6 sm:grid-cols-2 xl:grid-cols-4">
      {BUSINESS_PLANS.map((plan) => (
        <BusinessCard key={plan.key} plan={plan} cycle={cycle} />
      ))}
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export function PricingView() {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");

  return (
    <div className="mx-auto max-w-6xl section-x section-y">
      <div className="space-y-4 text-center">
        <h1 className="font-display text-display font-bold text-brand-primary">
          {PAGE_COPY.title}
        </h1>
        <p className="mx-auto max-w-3xl text-subheading text-brand-ink-secondary">
          {PAGE_COPY.subtitle}
        </p>
      </div>

      <div className="mt-10 space-y-3">
        <BillingToggle active={cycle} onChange={setCycle} />
        <p className="text-center text-small text-brand-ink-secondary">
          {PAGE_COPY.taxNote}
        </p>
      </div>

      <section className="mt-12 sm:mt-16">
        <div className="space-y-4 text-center">
          <h2 className="font-display text-section font-semibold text-brand-primary">
            {PAGE_COPY.candidatesHeading}
          </h2>
          <p className="mx-auto max-w-3xl text-subheading text-brand-ink-secondary">
            {PAGE_COPY.candidatesSubtitle}
          </p>
        </div>
        <CandidatePlans cycle={cycle} />
      </section>

      <section className="mt-16 sm:mt-20">
        <div className="space-y-4 text-center">
          <h2 className="font-display text-section font-semibold text-brand-primary">
            {PAGE_COPY.businessesHeading}
          </h2>
          <p className="mx-auto max-w-3xl text-subheading text-brand-ink-secondary">
            {PAGE_COPY.businessesSubtitle}
          </p>
        </div>
        <BusinessPlans cycle={cycle} />
      </section>

      <div className="mx-auto mt-12 max-w-4xl sm:mt-20">
        <div className="section-gap space-y-4 text-center">
          <h2 className="font-display text-section font-semibold text-brand-primary">
            {PAGE_COPY.faqHeading}
          </h2>
          <div className="mx-auto h-1 w-16 rounded-full bg-brand-secondary" />
          <p className="text-subheading text-brand-ink-secondary">
            {PAGE_COPY.faqBlurb}
          </p>
        </div>
        <PricingFaq items={FAQ_ITEMS} />
      </div>
    </div>
  );
}
