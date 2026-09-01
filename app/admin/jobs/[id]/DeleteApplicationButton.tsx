"use client";

import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ACTION_BTN } from "@/components/data-table/TableCard";
import { cn } from "@/lib/utils";

// S11 — UI ONLY. `deleteApplication` does not exist and must not be written
// here: deleting an Application cascades to its InterviewResult and its
// GeneratedQuestion rows, and that decision is unresolved. Confirming toasts.
export function DeleteApplicationButton({
  candidateName,
}: {
  candidateName: string;
}) {
  return (
    <ConfirmDialog
      trigger={
        <Button
          type="button"
          size="sm"
          className={cn(ACTION_BTN, "bg-accent-2 hover:bg-accent-2/90")}
        >
          Delete Application
        </Button>
      }
      icon={Trash2}
      title="Are you sure?"
      confirmLabel="Delete Application"
      contentClassName="sm:max-w-[693px]"
      onConfirm={() =>
        toast.info("Deleting an application isn't available yet.")
      }
      description={
        <>
          Deleting <span className="font-bold">{candidateName}</span>&apos;s
          application also permanently deletes their interview result and the
          questions generated for it. None of it can be recovered.
        </>
      }
    />
  );
}
