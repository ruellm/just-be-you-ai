"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { applyToJob } from "@/app/candidate/jobs/[id]/actions";

// "Apply Now" for the redesigned JobCard. Same server action + redirect
// handling as the job-detail ApplyButton; the card passes `disabled` for the
// closed / already-applied states.
export function JobCardApplyButton({
  jobId,
  disabled,
}: {
  jobId: string;
  disabled?: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      disabled={disabled || pending}
      className="h-9 flex-1 rounded-[8px] bg-brand-secondary font-body text-sm font-medium text-white hover:bg-brand-secondary/90 disabled:bg-brand-border disabled:text-white disabled:opacity-100"
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
      {pending ? "Preparing…" : "Apply Now"}
    </Button>
  );
}
