"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { applyToJob } from "./actions";

// Creates a submitted Application then (server-side) redirects to the
// on-demand interview screen.
export function ApplyButton({ jobId }: { jobId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      size="lg"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          try {
            await applyToJob(jobId);
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
            toast.error("Could not apply. Please try again.");
          }
        })
      }
    >
      {pending ? "Preparing your interview…" : "Apply"}
    </Button>
  );
}
