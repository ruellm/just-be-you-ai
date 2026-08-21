"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ACTION_BTN } from "@/components/data-table/TableCard";
import { cn } from "@/lib/utils";
import { toggleJobStatus } from "./actions";

// Open <-> closed toggle. Close = accent-2 (red), Re-Open = accent-1 (blue);
// behaviour (pending state + refresh) is unchanged. `variant="row"` is the
// small table action button; `"header"` is the 36px job-page button with
// "Close Job" / "Re-Open Job" labels.
export function JobStatusToggle({
  jobId,
  status,
  variant = "row",
}: {
  jobId: string;
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

  return (
    <Button
      size="sm"
      onClick={toggle}
      disabled={pending}
      className={cn(
        variant === "header"
          ? "h-9 rounded-[8px] px-5 font-body text-small font-medium text-white"
          : ACTION_BTN,
        status === "open"
          ? "bg-accent-2 hover:bg-accent-2/90"
          : "bg-accent-1 hover:bg-accent-1/90"
      )}
    >
      {variant === "header"
        ? status === "open"
          ? "Close Job"
          : "Re-Open Job"
        : status === "open"
          ? "Close"
          : "Re-Open"}
    </Button>
  );
}
