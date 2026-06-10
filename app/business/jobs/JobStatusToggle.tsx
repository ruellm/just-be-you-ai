"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { toggleJobStatus } from "./actions";

// Open <-> closed toggle for a job row.
export function JobStatusToggle({
  jobId,
  status,
}: {
  jobId: string;
  status: "open" | "closed";
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
    <Button variant="outline" size="sm" onClick={toggle} disabled={pending}>
      {status === "open" ? "Close" : "Reopen"}
    </Button>
  );
}
