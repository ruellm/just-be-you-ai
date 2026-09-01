"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ACTION_BTN } from "@/components/data-table/TableCard";
import { cn } from "@/lib/utils";
import { toggleJobStatus } from "./actions";

// Open <-> closed toggle. Reopen = accent-1 (blue); Close = brand-ink with a
// XCircle icon on the header variant (B7a #26). Behaviour (pending state +
// refresh) is unchanged. `variant="row"` is the small table action button;
// `"header"` is the job-page button with "Close" / "Reopen Job" labels.
//
// CLOSING is gated behind a confirmation (B7a #26) on BOTH the job detail
// header and the jobs-list row; REOPENING is deliberately NOT gated — it is
// reversible and non-destructive.
export function JobStatusToggle({
  jobId,
  jobTitle,
  companyName,
  status,
  variant = "row",
}: {
  jobId: string;
  jobTitle: string;
  companyName: string;
  status: "open" | "closed";
  variant?: "row" | "header";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      const result = await toggleJobStatus(jobId);
      if (!result.success) {
        toast.error(result.error ?? "Could not update job.");
        return;
      }
      toast.success(status === "open" ? "Job closed" : "Job reopened");
      router.refresh();
    });
  }

  const isOpen = status === "open";
  const label = isOpen ? "Close" : variant === "header" ? "Reopen Job" : "Reopen";

  const button = (
    <Button
      size="sm"
      // Reopen acts immediately; Close is handed to the dialog below.
      onClick={isOpen ? undefined : toggle}
      disabled={pending}
      className={cn(
        variant === "header"
          ? isOpen
            ? "h-[35px] min-w-[94px] rounded-[5px] px-4 font-body text-small font-medium text-brand-canvas"
            : "h-[35px] rounded-[8px] px-5 font-body text-small font-medium text-white"
          : ACTION_BTN,
        isOpen
          ? variant === "header"
            ? "bg-brand-ink hover:bg-brand-ink/90"
            : "bg-accent-2 hover:bg-accent-2/90"
          : "bg-accent-1 hover:bg-accent-1/90"
      )}
    >
      {isOpen && variant === "header" ? <XCircle /> : null}
      {label}
    </Button>
  );

  if (!isOpen) return button;

  return (
    <ConfirmDialog
      trigger={button}
      icon={XCircle}
      title="Are you sure?"
      confirmLabel="Close Job Posting"
      onConfirm={toggle}
      contentClassName="sm:max-w-[693px]"
      description={
        <>
          This action cannot be undone. The job posting{" "}
          <span className="font-bold">&ldquo;{jobTitle}&rdquo;</span> by{" "}
          <span className="font-bold">{companyName}</span> will be closed for
          applications. It can be reopened any time.
        </>
      }
    />
  );
}
