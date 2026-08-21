import type { FaqItem } from "./PricingFaq";

export const AUDIENCES = ["candidates", "businesses"] as const;
export type Audience = (typeof AUDIENCES)[number];

export function parseAudience(value: string | string[] | undefined): Audience {
  const v = Array.isArray(value) ? value[0] : value;
  return v === "businesses" ? "businesses" : "candidates";
}

export function pricingHref(audience: Audience): string {
  return audience === "candidates" ? "/pricing" : "/pricing?audience=businesses";
}

export const PAGE_COPY: Record<
  Audience,
  { metaTitle: string; title: string; subtitle: string; faqBlurb: string }
> = {
  candidates: {
    metaTitle: "Pricing — Just Be You",
    title: "Invest in Your Potential",
    subtitle:
      "Choose the plan that fits your career stage. Practice, get feedback, and land your dream role with confidence.",
    faqBlurb: "Everything you need to know about our candidate plans.",
  },
  businesses: {
    metaTitle: "Business Pricing — Just Be You",
    title: "Scale Your AI Workforce",
    subtitle:
      "Allow our AI to match you highly suitable candidates with ease. Choose the tier that fits your hiring volume.",
    faqBlurb: "Everything you need to know about our business plans.",
  },
};

export const FAQ_ITEMS: Record<Audience, FaqItem[]> = {
  candidates: [
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
  ],
  businesses: [
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
  ],
};

export const FREE_FEATURES = [
  { text: "2 seats/Maximum of 2 interviews total", included: true },
  { text: "Simple pass/fail status", included: true },
  { text: "1-week wait on fail", included: true },
  { text: "Detailed feedback", included: false },
  { text: "Next-day retake", included: false },
] as const;

export const CANDIDATE_PRO_FEATURES = [
  "10 seats/Unlimited interviews for chosen roles",
  "Full score & detailed feedback",
  "Next-day retake on fail",
  "Dedicated remarks section",
  "Priority support",
] as const;

export const STARTER_FEATURES = [
  { icon: "check", text: "Unlimited job postings" },
  { icon: "check", text: "Basic AI match filtering" },
  { icon: "info", text: "-1 credit to reveal candidate info" },
] as const;

export const ENTERPRISE_FEATURES = STARTER_FEATURES;

export const BUSINESS_PRO_FEATURES = [
  "Everything in Starter",
  "Advanced AI Scoring",
  "Automated Outreach Flows",
  "Enhanced Support",
] as const;

export const SCALE_FEATURES = [
  "Everything in Professional",
  "Custom Analytics",
  "Dedicated ATS Integration",
] as const;
