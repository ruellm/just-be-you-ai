"use client";

import { useState } from "react";
import Link from "next/link";
import { AtSign, Lock, User } from "lucide-react";
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
  AuthTextarea,
} from "@/components/auth/AuthCard";

const COPY: Record<AuthAudience, { title: string; subtitle: string }> = {
  candidate: {
    title: "Create Your Candidate Profile",
    subtitle: "Let's get you set up to apply.",
  },
  business: {
    title: "Create Your Business Profile",
    subtitle:
      "Our dedicated sales team sets up business accounts directly to ensure proper system integration. Standard self-service sign-up is not available for employers.",
  },
};

export function SignupCard() {
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

// Google is the ONLY working candidate signup path. Email signup is deferred
// (it needs our own email verification), so the form below is presentational
// and toasts — there is no account-creation action behind it.
function CandidateTab() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    toast.info(
      "Email sign-up isn't available yet — please use Sign up with Google.",
    );
  }

  return (
    <div className="space-y-5">
      <GoogleAuthButton
        role="candidate"
        label="Sign up with Google"
        className={AUTH_GOOGLE_BUTTON}
      />
      <AuthDivider />
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthField
          id="signup-full-name"
          label="Full Name"
          autoComplete="name"
          icon={User}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
        <AuthField
          id="signup-email"
          label="Email Address"
          type="email"
          autoComplete="email"
          icon={AtSign}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <AuthField
          id="signup-password"
          label="Password"
          type="password"
          autoComplete="new-password"
          icon={Lock}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button type="submit" className={AUTH_PRIMARY_BUTTON}>
          Create Account
        </Button>
      </form>
      <AuthFooterNote>
        Already have an account?{" "}
        <Link href="/login" className={AUTH_LINK}>
          Sign in here.
        </Link>
      </AuthFooterNote>
    </div>
  );
}

// NOT a signup form — a sales enquiry. No backend exists, so this mirrors
// /contact exactly: local state keeps the fields interactive and submitting
// explains the situation with the same message ContactForm uses.
function BusinessTab() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    toast.info(
      "The contact form isn't connected yet — please email us directly at hello@justbeyou.ai and we'll get back to you.",
    );
  }

  return (
    <div className="space-y-5">
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthField
          id="business-rep-name"
          label="Representative Name"
          autoComplete="name"
          icon={User}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <AuthField
          id="business-email"
          label="Email Address"
          type="email"
          autoComplete="email"
          icon={AtSign}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <AuthTextarea
          id="business-message"
          label="Message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <Button type="submit" className={AUTH_PRIMARY_BUTTON}>
          Send Message
        </Button>
      </form>
      <AuthFooterNote>
        Our team will reach out within 3-5 business days.
      </AuthFooterNote>
    </div>
  );
}
