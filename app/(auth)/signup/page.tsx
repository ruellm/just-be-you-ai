import Link from "next/link";
import { GoogleAuthButton } from "@/components/GoogleAuthButton";

export default function CandidateSignupPage() {
  return (
    <div className="w-full max-w-[448px] overflow-hidden rounded-[8px] border border-brand-border bg-brand-surface shadow-sm">
      <div className="space-y-6 p-8 sm:p-10">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold text-brand-ink">
            Sign up as a candidate
          </h1>
          <p className="text-[15px] text-brand-ink-secondary">
            Find your next opportunity.
          </p>
        </div>
        <GoogleAuthButton
          role="candidate"
          label="Sign up with Google"
          className="h-14 rounded-[4px] bg-brand-primary text-white hover:bg-brand-primary/90"
        />
        <p className="text-center text-sm text-brand-ink-secondary">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-brand-primary">
            Log in
          </Link>
        </p>
      </div>

      {/* Business footer strip — flush to the card edges */}
      <div className="space-y-1 border-t border-brand-border bg-brand-secondary/10 px-8 py-5 text-center">
        <p className="text-base text-brand-ink-secondary">
          Are you a business?
        </p>
        <Link
          href="/contact"
          className="font-display text-[13px] font-semibold tracking-[0.8px] text-brand-primary uppercase"
        >
          Contact us to get started
        </Link>
      </div>
    </div>
  );
}
