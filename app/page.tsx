import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ClipboardList, Mic, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/Footer";
import { PublicNav } from "@/components/PublicNav";
import { getCurrentDbUser, getDashboardPath } from "@/lib/auth";

const HOW_IT_WORKS = [
  {
    icon: ClipboardList,
    title: "Apply",
    body: "Build your profile and apply to roles matched to your skills using our intuitive talent portal.",
    highlighted: false,
  },
  {
    icon: Mic,
    title: "AI Interview",
    body: "Take a short, on-demand AI interview with no scheduling hassles. Talk naturally about your experience.",
    highlighted: true,
  },
  {
    icon: Sparkles,
    title: "Get Matched",
    body: "Your resume and interview results are shared with companies, focusing on your potential and cultural fit.",
    highlighted: false,
  },
] as const;

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
        {/* Hero */}
        <section className="bg-brand-surface">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 sm:py-24 lg:grid-cols-2">
            <div className="space-y-6">
              <span className="inline-flex items-center rounded-full bg-tag-1 px-4 py-1.5 text-xs font-semibold tracking-widest text-brand-ink uppercase">
                Next-Gen Hiring
              </span>
              <h1 className="font-display text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
                Experience the Future of Hiring.{" "}
                <span className="text-brand-primary">Just Be You.</span>
              </h1>
              <p className="max-w-xl text-lg text-brand-ink-secondary">
                AI-powered interviews that help great talent get noticed — and
                help companies find the right people, faster.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  asChild
                  size="lg"
                  className="rounded-full bg-brand-secondary text-white hover:bg-brand-secondary/90"
                >
                  <Link href="/signup">Get Started</Link>
                </Button>
                {/* No public job-listing route exists (jobs live behind the
                    candidate login), so this points at signup for now. */}
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="rounded-full border-brand-primary text-brand-primary hover:bg-brand-primary/5 hover:text-brand-primary"
                >
                  <Link href="/signup">View Open Roles</Link>
                </Button>
              </div>
            </div>
            <div className="relative hidden aspect-4/3 overflow-hidden rounded-3xl lg:block">
              <Image
                src="/hero-1.png"
                alt="Candidate taking an AI interview"
                fill
                sizes="(min-width: 1024px) 50vw, 0px"
                className="object-cover"
                priority
              />
            </div>
          </div>
        </section>

        {/* Business callout banner */}
        <section className="relative overflow-hidden bg-brand-card">
          {/* Fallback glows — visible only if the banner photo is missing */}
          <div
            aria-hidden
            className="absolute -top-24 -right-24 size-96 rounded-full bg-brand-secondary/25 blur-3xl"
          />
          <div
            aria-hidden
            className="absolute -bottom-32 -left-16 size-80 rounded-full bg-brand-primary/40 blur-3xl"
          />
          {/* Full-bleed banner photo + dark overlay for text contrast */}
          <div
            aria-hidden
            className="absolute inset-0 bg-[url('/business-banner.jpeg')] bg-cover bg-center"
          />
          <div aria-hidden className="absolute inset-0 bg-brand-card/70" />
          <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-6 px-6 py-16 text-center sm:py-20">
            <h2 className="text-2xl font-semibold text-white sm:text-3xl">
              Are you a business?
            </h2>
            <p className="text-white/80">
              Scale your recruiting with human-centric AI assessments. Reduce
              time-to-hire by 60%.
            </p>
            <Button
              asChild
              size="lg"
              className="rounded-full bg-white text-brand-primary hover:bg-white/90"
            >
              <a href="mailto:hello@justbeyou.ai">
                Contact us at hello@justbeyou.ai
              </a>
            </Button>
          </div>
        </section>

        {/* How It Works */}
        <section className="bg-brand-canvas">
          <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
            <div className="mb-12 space-y-3 text-center">
              <h2 className="font-display text-3xl font-semibold tracking-tight">
                How It Works
              </h2>
              <div className="mx-auto h-1 w-16 rounded-full bg-brand-secondary" />
            </div>
            <div className="grid gap-6 sm:grid-cols-3">
              {HOW_IT_WORKS.map((step) => (
                <div
                  key={step.title}
                  className="space-y-4 rounded-2xl border border-brand-border bg-brand-surface p-6"
                >
                  <div
                    className={`flex size-12 items-center justify-center rounded-xl ${
                      step.highlighted
                        ? "bg-brand-secondary text-white"
                        : "bg-brand-secondary/10 text-brand-secondary"
                    }`}
                  >
                    <step.icon className="size-6" />
                  </div>
                  <p className="text-xl font-semibold">{step.title}</p>
                  <p className="text-sm text-brand-ink-secondary">
                    {step.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Bottom CTA banner — contained rounded card on the light canvas */}
        <section className="bg-brand-canvas">
          <div className="mx-auto max-w-6xl px-6 pb-16 sm:pb-20">
            <div className="space-y-6 rounded-3xl bg-brand-card px-6 py-16 text-center sm:py-20">
              <h2 className="text-3xl font-semibold text-white">
                Ready to find your match?
              </h2>
              <p className="mx-auto max-w-2xl text-white/80">
                Join the growing community of candidates discovering their
                dream roles through empathetic AI matching.
              </p>
              <Button
                asChild
                size="lg"
                className="rounded-full bg-brand-secondary text-white hover:bg-brand-secondary/90"
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
