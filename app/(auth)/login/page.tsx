import Link from "next/link";
import { GoogleAuthButton } from "@/components/GoogleAuthButton";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="w-full max-w-[461px] space-y-6 rounded-[8px] border border-brand-border bg-brand-surface card-pad shadow-sm sm:p-10">
      <div className="space-y-2 text-center">
        <h1 className="text-heading font-semibold text-brand-ink">
          Welcome to Just Be You!
        </h1>
        <p className="text-body text-brand-ink-secondary">
          Sign in to access your account and view open roles.
        </p>
      </div>

      {/* Candidates */}
      <section className="space-y-3">
        <p className="font-display text-center text-meta tracking-[1.2px] text-brand-ink-secondary uppercase">
          For Candidates
        </p>
        <GoogleAuthButton
          label="Sign in with Google"
          className="h-12 rounded-[4px] sm:h-14 bg-brand-primary text-white hover:bg-brand-primary/90"
        />
        <p className="text-center text-small text-brand-ink-secondary">
          New to this website?{" "}
          <Link href="/signup" className="font-semibold text-brand-primary">
            Sign up
          </Link>
        </p>
      </section>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-brand-border" />
        </div>
        <div className="relative flex justify-center">
          <span className="font-display bg-brand-surface px-3 text-meta tracking-[1.2px] text-brand-ink-secondary uppercase">
            Businesses &amp; Admins
          </span>
        </div>
      </div>

      {/* Businesses & admins */}
      <LoginForm />
    </div>
  );
}
