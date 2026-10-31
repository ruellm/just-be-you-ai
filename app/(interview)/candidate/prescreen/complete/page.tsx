import Link from "next/link";
import { CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

// Shown after a pre-screening interview ends. There is no candidate-facing
// score for a pre-screen, so this page carries no result data at all.
export default function PrescreenCompletePage() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-4xl items-center px-6 py-12 font-body">
      <section className="flex w-full flex-col items-center gap-6 rounded-[12px] border border-brand-border bg-brand-surface px-6 py-12 text-center sm:px-16">
        <CircleCheck className="size-16 text-accent-3" strokeWidth={1.5} />
        <div className="space-y-3">
          <h1 className="text-heading font-bold text-brand-primary">
            Pre-Screening Complete
          </h1>
          <p className="mx-auto max-w-2xl text-body tracking-[-0.1px] text-brand-ink-secondary">
            Thank you for participating! Your pre-screening interview has been
            submitted. We&apos;re reviewing your answers and will match you with
            employers who fit your skills.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <Button
            asChild
            variant="outline"
            className="h-9 rounded-[8px] border-brand-secondary bg-brand-surface px-5 text-small font-semibold text-brand-secondary hover:bg-brand-secondary/10"
          >
            <Link href="/candidate/profile">Go to Profile</Link>
          </Button>
          <Button
            asChild
            className="h-9 rounded-[8px] bg-brand-secondary px-6 text-small font-semibold text-white hover:bg-brand-secondary/90"
          >
            <Link href="/candidate/jobs">Browse Other Jobs</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
