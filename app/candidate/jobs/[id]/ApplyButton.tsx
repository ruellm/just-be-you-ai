"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { applyToJob } from "./actions";

// Creates a submitted Application then (server-side) redirects to the
// on-demand interview screen.
// `className` / `label` are visual-only hooks for the redesigned detail page.
export function ApplyButton({
  jobId,
  className,
  label = "Apply",
}: {
  jobId: string;
  className?: string;
  label?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      size="lg"
      className={className}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          try {
            const result = await applyToJob(jobId);
            if (result && !result.ok) {
              toast.error(result.message);
              router.refresh();
            }
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
      {pending ? "Preparing your interview…" : label}
    </Button>
  );
}
