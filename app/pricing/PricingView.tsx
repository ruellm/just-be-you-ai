"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CircleCheck, CircleX, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AudienceToggle } from "./AudienceToggle";
import { PricingFaq } from "./PricingFaq";
import {
  type Audience,
  BUSINESS_PRO_FEATURES,
  CANDIDATE_PRO_FEATURES,
  ENTERPRISE_FEATURES,
  FAQ_ITEMS,
  FREE_FEATURES,
  PAGE_COPY,
  SCALE_FEATURES,
  STARTER_FEATURES,
  parseAudience,
  pricingHref,
} from "./content";

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

function CandidatePlans() {
  return (
    <div className="mx-auto mt-12 grid max-w-4xl gap-8 lg:grid-cols-2">
      <div className="flex flex-col overflow-hidden rounded-[12px] border border-brand-border bg-brand-surface">
        <div aria-hidden className="h-[13px] bg-brand-secondary" />
        <div className="flex flex-1 flex-col stack-gap card-pad">
          <span className="font-display self-start rounded-full bg-tag-1 px-3 py-1 text-meta font-semibold tracking-[1.2px] text-brand-ink-secondary uppercase">
            Free
          </span>
          <p>
            <span className="text-price font-semibold text-brand-primary">$0</span>
            <span className="text-body text-brand-ink-secondary">/forever</span>
          </p>
          <p className="text-small text-brand-ink-secondary">
            Perfect for exploring the platform and trying out basic features.
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

      <div className="flex flex-col overflow-hidden rounded-[12px] bg-brand-primary">
        <div aria-hidden className="h-[13px] bg-brand-tertiary" />
        <div className="flex flex-1 flex-col stack-gap card-pad">
          <div className="flex items-start justify-between gap-4">
            <span className="font-display rounded-full bg-tag-1 px-3 py-1 text-meta font-semibold tracking-[1.2px] text-brand-ink-secondary uppercase">
              Professional
            </span>
            <span className="text-xs text-status-success">Most Popular!</span>
          </div>
          <p>
            <span className="text-price font-semibold text-status-success">$12</span>
            <span className="text-body text-white/80">/month</span>
          </p>
          <p className="text-small text-white">
            Accelerate your growth with deep insights, more choices, and
            unlimited interviews.
          </p>
          <ul className="space-y-3">
            {CANDIDATE_PRO_FEATURES.map((feature) => (
              <li
                key={feature}
                className="flex items-start gap-2.5 text-small font-medium text-white"
              >
                <CircleCheck className="size-5 shrink-0 text-brand-tertiary" />
                {feature}
              </li>
            ))}
          </ul>
          <Button
            asChild
            className="mt-auto h-11 w-full rounded-[12px] bg-brand-tertiary text-brand-ink hover:bg-brand-tertiary/90"
          >
            <Link href="/signup">Upgrade to Professional</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function BusinessPlans() {
  return (
    <div className="mt-12 grid items-end gap-6 sm:grid-cols-2 xl:grid-cols-4">
      <div className="flex flex-col overflow-hidden rounded-[12px] border border-brand-border bg-brand-surface">
        <div aria-hidden className="h-[13px] bg-brand-secondary" />
        <div className="flex flex-1 flex-col gap-4 card-pad">
          <SeatTag label="5 Seats" />
          <p className="text-heading font-semibold text-brand-primary">Starter</p>
          <p>
            <span className="text-price font-semibold text-brand-primary">$29</span>
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

      <div className="flex flex-col overflow-hidden rounded-[12px] bg-brand-primary">
        <div className="flex justify-center pt-3">
          <span className="font-display rounded-full bg-brand-tertiary px-4 py-1 text-xs font-semibold tracking-[1.2px] whitespace-nowrap text-brand-ink-secondary uppercase">
            Most Popular
          </span>
        </div>
        <div className="flex flex-1 flex-col gap-4 card-pad">
          <SeatTag label="25 Seats" />
          <p className="text-heading font-semibold text-white">Professional</p>
          <p>
            <span className="text-price font-semibold text-white">$99</span>
            <span className="text-body text-white">/month</span>
          </p>
          <p className="text-small text-white">
            Ideal for growing teams with consistent hiring needs.
          </p>
          <DarkFeatureList features={BUSINESS_PRO_FEATURES} />
          <Button
            asChild
            className="mt-4 h-11 w-full rounded-[12px] bg-brand-tertiary text-brand-ink hover:bg-brand-tertiary/90"
          >
            <Link href="/signup">Choose Professional</Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-col rounded-[12px] bg-brand-card">
        <div className="flex flex-1 flex-col gap-4 card-pad">
          <SeatTag label="50 Seats" />
          <p className="text-heading font-semibold text-white">Scale</p>
          <p>
            <span className="text-price font-semibold text-white">$149</span>
            <span className="text-body text-white">/month</span>
          </p>
          <p className="text-small text-white">
            Best for big companies with high-volume recruitments ongoing.
          </p>
          <DarkFeatureList features={SCALE_FEATURES} />
          <Button
            asChild
            className="mt-4 h-11 w-full rounded-[12px] bg-brand-tertiary text-brand-ink hover:bg-brand-tertiary/90"
          >
            <Link href="/signup">Choose Scale</Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-col overflow-hidden rounded-[12px] border border-brand-border bg-brand-surface">
        <div aria-hidden className="h-[13px] bg-brand-secondary" />
        <div className="flex flex-1 flex-col gap-4 card-pad">
          <SeatTag label="50+ Seats" />
          <p className="text-heading font-semibold text-brand-primary">Enterprise</p>
          <p className="text-price font-semibold text-brand-primary">
            Custom Pricing
          </p>
          <p className="text-small text-brand-ink-secondary">
            We provide tailored solutions for global organizations.
          </p>
          <LightFeatureList features={ENTERPRISE_FEATURES} />
          <Button
            asChild
            className="mt-4 h-11 w-full rounded-[12px] bg-brand-secondary text-white hover:bg-brand-secondary/90"
          >
            <Link href="/contact">Contact Sales</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export function PricingView({ initialAudience }: { initialAudience: Audience }) {
  const [audience, setAudience] = useState<Audience>(initialAudience);
  const copy = PAGE_COPY[audience];

  useEffect(() => {
    function onPopState() {
      setAudience(
        parseAudience(
          new URLSearchParams(window.location.search).get("audience") ?? undefined
        )
      );
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  function select(next: Audience) {
    if (next === audience) return;
    setAudience(next);
    window.history.pushState(null, "", pricingHref(next));
  }

  return (
    <div className="mx-auto max-w-6xl section-x section-y">
      <div className="space-y-4 text-center">
        <h1 className="font-display text-page-title font-bold text-brand-primary">
          {copy.title}
        </h1>
        <p className="mx-auto max-w-3xl text-subheading text-brand-ink-secondary">
          {copy.subtitle}
        </p>
      </div>

      <div className="mt-10">
        <AudienceToggle active={audience} onChange={select} />
      </div>

      {audience === "candidates" ? <CandidatePlans /> : <BusinessPlans />}

      <div className="mx-auto mt-12 max-w-4xl sm:mt-20">
        <div className="section-gap space-y-4 text-center">
          <h2 className="font-display text-section font-semibold text-brand-primary">
            Frequently Asked Questions
          </h2>
          <div className="mx-auto h-1 w-16 rounded-full bg-brand-secondary" />
          <p className="text-subheading text-brand-ink-secondary">{copy.faqBlurb}</p>
        </div>
        <PricingFaq key={audience} items={FAQ_ITEMS[audience]} />
      </div>
    </div>
  );
}
