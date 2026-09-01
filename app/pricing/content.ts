import type { FaqItem } from "./PricingFaq";

// Pricing v2: ONE page with both audiences stacked, governed by a single
// Monthly/Yearly toggle. Both price sets are hardcoded per the design — the
// yearly figures are NOT a computed 10% off the monthly ones, so never derive
// one from the other.

export type BillingCycle = "monthly" | "yearly";

export const PAGE_COPY = {
  metaTitle: "Pricing — Just Be You",
  title: "Invest in Your Potential",
  subtitle:
    "Whether you're looking to ace your next interview or scaling a team of engineers, we have a plan designed for you.",
  taxNote: "* Government charges and applicable taxes are not included.",
  candidatesHeading: "For Candidates",
  candidatesSubtitle:
    "Elevate your interview skills with real-time feedback and the confidence to land your dream role in any industry.",
  businessesHeading: "For Businesses",
  businessesSubtitle:
    "Scale your talent acquisition with AI matching, automated candidate screening, and powerful collaborative tools.",
  faqHeading: "Frequently Asked Questions",
  faqBlurb:
    "Everything you need to know about our candidate and business plans.",
};

// ── Candidate plans ─────────────────────────────────────────────────────────

export type ToggleFeature = { text: string; included: boolean };

export const CANDIDATE_FREE_FEATURES: readonly ToggleFeature[] = [
  { text: "Up to 2 interviews total (max. 30 mins each)", included: true },
  { text: "Simple pass/fail status", included: true },
  { text: "Apply for a new job or retake monthly", included: true },
  { text: "2-week wait before retaking a failed interview", included: true },
  { text: "Detailed feedback", included: false },
  { text: "Cannot see hiring company details", included: false },
] as const;

export const CANDIDATE_PRO_FEATURES: readonly string[] = [
  "Up to 5 interviews per month (max. 60 mins each)",
  "Full score and detailed feedback",
  "3-days wait before retaking a failed interview",
  "Dedicated remarks section",
  "Can see the hiring company upon passing",
  "Priority customer support",
] as const;

export const CANDIDATE_PRO_PRICE = { monthly: "$27.99", yearly: "$24.99" };

// ── Business plans ──────────────────────────────────────────────────────────

// "light"   = white surface, brand-border, brand-secondary top strip
// "primary" = brand-primary surface, brand-tertiary top strip
// "card"    = brand-card surface, NO top strip (per the design)
export type BusinessCardVariant = "light" | "primary" | "card";

export type BusinessPlan = {
  key: string;
  seats: string;
  name: string;
  /** null = no billed price (Enterprise shows "Custom Pricing"). */
  price: { monthly: string; yearly: string } | null;
  priceLabel?: string;
  blurb: string;
  features: readonly string[];
  cta: { label: string; href: string; tone: "secondary" | "tertiary" };
  variant: BusinessCardVariant;
  mostPopular?: boolean;
};

export const BUSINESS_PLANS: readonly BusinessPlan[] = [
  {
    key: "starter",
    seats: "5 Seats",
    name: "Starter",
    price: { monthly: "$87", yearly: "$79" },
    blurb: "Perfect for small agencies and startups.",
    features: [
      "Unlimited job postings",
      "Basic AI matching and screening",
      "View candidate using seat credits",
      "Standard email support",
    ],
    cta: { label: "Get Started", href: "/signup", tone: "secondary" },
    variant: "light",
  },
  {
    key: "professional",
    seats: "25 Seats",
    name: "Professional",
    price: { monthly: "$329", yearly: "$299" },
    blurb: "Ideal for growing teams with consistent hiring needs.",
    features: [
      "Everything in Starter",
      "Advanced AI Scoring",
      "Automated Outreach Flows",
      "AI-assisted Recommendations",
    ],
    cta: { label: "Choose Professional", href: "/signup", tone: "tertiary" },
    variant: "primary",
    mostPopular: true,
  },
  {
    key: "scale",
    seats: "50 Seats",
    name: "Scale",
    price: { monthly: "$549", yearly: "$499" },
    blurb: "Best for big companies with high-volume recruitments ongoing.",
    features: [
      "Everything in Professional",
      "Custom Analytics",
      "Enhanced Support",
      "Dedicated ATS Integration",
    ],
    cta: { label: "Choose Scale", href: "/signup", tone: "tertiary" },
    variant: "card",
  },
  {
    key: "enterprise",
    seats: "50+ Seats",
    name: "Enterprise",
    price: null,
    priceLabel: "Custom Pricing",
    blurb: "We provide tailored solutions for global organizations.",
    features: [
      "Everything in Scale",
      "Custom Seat Allocations",
      "Custom Solutions & Full Control",
      "Dedicated Onboarding & Training",
    ],
    cta: { label: "Contact Sales", href: "/contact", tone: "secondary" },
    variant: "light",
  },
] as const;

// ── FAQ ─────────────────────────────────────────────────────────────────────

// Answers 1, 2, 3, 5 and 6 are carried over verbatim from the two v1 pricing
// pages. Answer 4 is newly authored for v2 (no v1 equivalent under this
// question). Q1's answer says "Free plan" — v1 still said "Starter plan",
// which contradicted the card label.
export const FAQ_ITEMS: FaqItem[] = [
  {
    question: "How does the 2-week wait work on the free plan?",
    answer:
      "If you receive a 'Fail' status on an interview while on the Free plan, you must wait 2 weeks before you can retake that specific interview type. Professional users wait 3 days.",
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
  {
    question: "How does the seat credit system work?",
    answer:
      "Each business plan comes with a set number of seats, and viewing a candidate's full details spends one seat credit. Browsing roles, filtering matches and reading interview results cost nothing — you only spend a credit when you decide a candidate is worth pursuing. Credits reset monthly.",
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
