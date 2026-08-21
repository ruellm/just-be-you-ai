"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type DeleteResult = { success: boolean; error?: string };

// Shared confirmation dialog for deleting a profile row. `onConfirm` is the
// server action; on success we toast and refresh the server-rendered list.
export function ConfirmDelete({
  trigger,
  onConfirm,
  title = "Delete this entry?",
  description = "This action cannot be undone.",
  successMessage = "Deleted",
  confirmLabel = "Delete",
}: {
  trigger: ReactNode;
  onConfirm: () => Promise<DeleteResult>;
  title?: string;
  description?: ReactNode;
  successMessage?: string;
  confirmLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function handle() {
    setPending(true);
    const result = await onConfirm();
    setPending(false);
    if (!result.success) {
      toast.error(result.error ?? "Could not delete.");
      return;
    }
    toast.success(successMessage);
    setOpen(false);
    router.refresh();
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent className="w-full max-w-[calc(100%-2rem)] gap-0 rounded-[16px] bg-brand-surface p-8 font-body ring-0 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)] sm:max-w-[384px]">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-status-fail text-accent-2">
          <Trash2 className="size-7" />
        </div>
        <AlertDialogHeader className="items-center gap-2 pt-5 text-center sm:text-center">
          <AlertDialogTitle className="font-body text-subheading font-semibold text-brand-ink">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="font-body text-small text-brand-ink">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {/* Stacked full-width buttons: Delete on top, Cancel below. */}
        <AlertDialogFooter className="mx-auto mt-6 flex w-full max-w-[320px] flex-col gap-3 sm:flex-col sm:justify-stretch">
          <AlertDialogAction
            disabled={pending}
            onClick={(e) => {
              e.preventDefault();
              handle();
            }}
            className="h-auto w-full rounded-[8px] bg-accent-2 py-3 font-body text-small font-semibold text-white hover:bg-accent-2/90"
          >
            {pending ? "Deleting…" : confirmLabel}
          </AlertDialogAction>
          <AlertDialogCancel
            disabled={pending}
            className="h-auto w-full rounded-[8px] border-[0.8px] border-brand-border bg-brand-surface py-3 font-body text-small font-medium text-brand-ink hover:bg-brand-container"
          >
            Cancel
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
