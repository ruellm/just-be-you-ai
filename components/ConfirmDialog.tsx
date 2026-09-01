"use client";

import { useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
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
import { cn } from "@/lib/utils";

// The app's one confirmation-gate dialog: 64px status-fail circle, centred
// title + body, stacked full-width buttons (destructive action on top, Cancel
// below). Same visual language as components/profile/ConfirmDelete.
//
// It ONLY gates — `onConfirm` runs the caller's existing behaviour verbatim.
// No pending state, no toast, no refresh here; callers that already own those
// (e.g. JobStatusToggle's useTransition) keep them exactly as they are.
// ConfirmDelete stays separate because it owns a different async contract
// (awaits a server action, toasts, refreshes).
export function ConfirmDialog({
  trigger,
  icon: Icon,
  title,
  description,
  confirmLabel,
  onConfirm,
  contentClassName,
}: {
  trigger: ReactNode;
  icon: LucideIcon;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  /** Width override, e.g. "sm:max-w-[693px]". */
  contentClassName?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent
        className={cn(
          "w-full max-w-[calc(100%-2rem)] gap-0 rounded-[16px] bg-brand-surface p-8 font-body ring-0 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)] sm:max-w-[567px]",
          contentClassName
        )}
      >
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-status-fail text-accent-2">
          <Icon className="size-[29px]" />
        </div>
        <AlertDialogHeader className="items-center gap-2 pt-5 text-center sm:text-center">
          <AlertDialogTitle className="font-body text-subheading font-semibold text-brand-ink">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="mx-auto max-w-[567px] font-body text-small text-brand-ink">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mx-auto mt-6 flex w-full max-w-[320px] flex-col gap-3 sm:flex-col sm:justify-stretch">
          <AlertDialogAction
            onClick={() => onConfirm()}
            className="h-auto w-full rounded-[8px] bg-accent-2 py-3 font-body text-small font-semibold text-white hover:bg-accent-2/90"
          >
            {confirmLabel}
          </AlertDialogAction>
          <AlertDialogCancel className="h-auto w-full rounded-[8px] border-[0.8px] border-brand-border bg-brand-surface py-3 font-body text-small font-medium text-brand-ink hover:bg-brand-container">
            Cancel
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
