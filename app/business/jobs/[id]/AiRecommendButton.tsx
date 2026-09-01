"use client";

import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

// B7a #37 — the applicant filter row's "Let AI Recommend". There is NO backend
// for AI-assisted applicant recommendations or sorting, so this only toasts
// (round-wide rule for unbuilt actions: never disabled, never a silent no-op).
// Do not add recommendation logic or a server action here.
export function AiRecommendButton() {
  return (
    <Button
      type="button"
      onClick={() =>
        toast.info("AI recommendations aren't available yet — coming soon.")
      }
      className="h-10 min-w-[173px] rounded-[12px] bg-brand-secondary px-5 font-body text-small font-medium text-white hover:bg-brand-secondary/90"
    >
      <Sparkles /> Let AI Recommend
    </Button>
  );
}
