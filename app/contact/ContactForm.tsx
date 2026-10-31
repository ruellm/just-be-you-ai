"use client";

import { useState } from "react";
import { ChevronDown, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// The design doesn't list the dropdown options — this set is authored.
const SOURCE_OPTIONS = [
  "Company Referral",
  "Search Engine",
  "Social Media",
  "Word of Mouth",
  "Other",
] as const;

// No contact backend exists yet — submission just explains that and points
// at the support email. Local state keeps the fields interactive.
export function ContactForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [source, setSource] = useState<string>(SOURCE_OPTIONS[0]);
  const [message, setMessage] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    toast.info(
      "The contact form isn't connected yet — please email us directly at hello@justbeyou.ai and we'll get back to you.",
    );
  }

  const labelClass = "text-small font-semibold text-brand-ink";
  const inputClass =
    "rounded-[8px] border-brand-border bg-brand-surface text-small";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="contact-name" className={labelClass}>
          Full Name
        </Label>
        <Input
          id="contact-name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Your full name"
          autoComplete="name"
          className={inputClass}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="contact-email" className={labelClass}>
          Email Address
        </Label>
        <Input
          id="contact-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          className={inputClass}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="contact-source" className={labelClass}>
          How did you find us?
        </Label>
        <div className="relative">
          <select
            id="contact-source"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="h-9 w-full appearance-none rounded-[8px] border border-brand-border bg-brand-surface px-3 pr-10 text-small text-brand-ink"
          >
            {SOURCE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-brand-ink-secondary" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="contact-message" className={labelClass}>
          Message
        </Label>
        <Textarea
          id="contact-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="How can we help?"
          className={`min-h-[143px] ${inputClass}`}
        />
      </div>

      <Button
        type="submit"
        className="h-11 w-full rounded-[12px] bg-brand-tertiary text-brand-ink hover:bg-brand-tertiary/90"
      >
        Send Message
        <Send className="size-4" />
      </Button>
    </form>
  );
}
