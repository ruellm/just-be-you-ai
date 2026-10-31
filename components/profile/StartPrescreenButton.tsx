"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BTN_PRIMARY } from "@/app/candidate/profile/ProfileSectionCard";
import { startPrescreen } from "@/app/candidate/prescreen/actions";

// Starts the pre-screening interview; the action redirects into the interview
// Setup page on success.
export function StartPrescreenButton() {
  const [pending, startTransition] = useTransition();

  const start = () =>
    startTransition(async () => {
      try {
        const result = await startPrescreen();
        if (result && !result.ok) toast.error(result.message);
      } catch (error) {
        // A redirect throws NEXT_REDIRECT — let it propagate.
        if (
          error &&
          typeof error === "object" &&
          "digest" in error &&
          String((error as { digest?: string }).digest).startsWith(
            "NEXT_REDIRECT"
          )
        ) {
          throw error;
        }
        toast.error("Could not start the pre-screening. Please try again.");
      }
    });

  return (
    <Button type="button" onClick={start} disabled={pending} className={BTN_PRIMARY}>
      {pending ? "Preparing your interview…" : "Start Pre-screening"}
    </Button>
  );
}
