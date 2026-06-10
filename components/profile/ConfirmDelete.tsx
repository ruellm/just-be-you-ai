"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
}: {
  trigger: ReactNode;
  onConfirm: () => Promise<DeleteResult>;
  title?: string;
  description?: string;
  successMessage?: string;
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
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={(e) => {
              e.preventDefault();
              handle();
            }}
          >
            {pending ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
