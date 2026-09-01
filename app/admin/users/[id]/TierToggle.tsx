"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Crown } from "lucide-react";
import type { CandidateTier } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { BTN_INK } from "@/app/candidate/profile/ProfileSectionCard";
import { setCandidateTier } from "../actions";

// Candidate tier switch, sat next to Change Seats in the admin user header.
// Free <-> Professional; Professional + a passed interview is what opens the
// hiring-company reveal. Rendered only for candidates (see UserHeaderActions).
export function TierToggle({
  candidateProfileId,
  tier,
}: {
  candidateProfileId: string;
  tier: CandidateTier;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const next: CandidateTier = tier === "professional" ? "free" : "professional";

  function toggle() {
    startTransition(async () => {
      const result = await setCandidateTier(candidateProfileId, next);
      if (!result.success) {
        toast.error(result.error ?? "Could not update tier.");
        return;
      }
      toast.success(
        next === "professional"
          ? "Upgraded to Professional"
          : "Moved to Free"
      );
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      onClick={toggle}
      disabled={pending}
      className={BTN_INK}
      title={`Currently ${tier === "professional" ? "Professional" : "Free"}`}
    >
      <Crown className="size-4" />
      {pending
        ? "Saving…"
        : next === "professional"
          ? "Set Professional"
          : "Set Free"}
    </Button>
  );
}
