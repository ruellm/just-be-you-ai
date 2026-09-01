"use client";

import { useState } from "react";
import Link from "next/link";
import { AtSign, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { GoogleAuthButton } from "@/components/GoogleAuthButton";
import {
  type AuthAudience,
  AUTH_GOOGLE_BUTTON,
  AUTH_LINK,
  AUTH_PRIMARY_BUTTON,
  AuthCard,
  AuthDivider,
  AuthField,
  AuthFooterNote,
} from "@/components/auth/AuthCard";
import { LoginForm } from "./LoginForm";

const COPY: Record<AuthAudience, { title: string; subtitle: string }> = {
  candidate: {
    title: "Sign In to Your Account",
    subtitle: "Find and apply for roles.",
  },
  business: {
    title: "Sign In to Your Account",
    subtitle: "Access your job postings and candidates.",
  },
};

export function LoginCard() {
  const [audience, setAudience] = useState<AuthAudience>("candidate");

  return (
    <AuthCard
      active={audience}
      onChange={setAudience}
      title={COPY[audience].title}
      subtitle={COPY[audience].subtitle}
    >
      {audience === "candidate" ? <CandidateTab /> : <BusinessTab />}
    </AuthCard>
  );
}

// Candidates authenticate with Google ONLY — no candidate password exists, so
// the email/password form below is presentational and toasts on submit. It is
// deliberately NOT wired to signInWithPassword.
function CandidateTab() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    toast.info(
      "Password sign-in isn't available for candidates yet — please use Sign in with Google.",
    );
  }

  return (
    <div className="space-y-5">
      <GoogleAuthButton label="Sign in with Google" className={AUTH_GOOGLE_BUTTON} />
      <AuthDivider />
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthField
          id="candidate-signin-email"
          label="Email Address"
          type="email"
          autoComplete="email"
          icon={AtSign}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <AuthField
          id="candidate-signin-password"
          label="Password"
          type="password"
          autoComplete="current-password"
          icon={Lock}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          labelAction={
            <Link href="/forgot-password" className={`text-small ${AUTH_LINK}`}>
              Forgot Password?
            </Link>
          }
        />
        <Button type="submit" className={AUTH_PRIMARY_BUTTON}>
          Sign In
        </Button>
      </form>
      <AuthFooterNote>
        New to this website?{" "}
        <Link href="/signup" className={AUTH_LINK}>
          Sign up here.
        </Link>
      </AuthFooterNote>
    </div>
  );
}

// Businesses AND admins sign in here through the real LoginForm. No Google
// button: business accounts are admin-provisioned and Google-for-business is
// not planned.
function BusinessTab() {
  return (
    <div className="space-y-5">
      <LoginForm />
      <AuthFooterNote>
        Don&apos;t have an account?{" "}
        <Link href="/contact" className={AUTH_LINK}>
          Contact our sales.
        </Link>
      </AuthFooterNote>
    </div>
  );
}
