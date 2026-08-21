"use client";

import { Ban, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

export function HideUserDialog({
  open,
  onOpenChange,
  hidden,
  name,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hidden: boolean;
  name: string;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-full max-w-[calc(100%-2rem)] gap-0 rounded-[16px] bg-brand-surface p-8 font-body ring-0 shadow-[0_20px_12.5px_rgba(0,0,0,0.1),0_8px_5px_rgba(0,0,0,0.1)] sm:max-w-[693px]"
      >
        <div className="flex flex-col items-center text-center">
          <div
            className={cn(
              "mb-5 flex size-16 items-center justify-center rounded-full",
              hidden ? "bg-accent-1/10" : "bg-accent-2/10"
            )}
          >
            {hidden ? (
              <Eye className="size-7 text-accent-1" />
            ) : (
              <Ban className="size-7 text-accent-2" />
            )}
          </div>
          <DialogTitle className="text-subheading font-semibold tracking-[-0.5px] text-brand-ink">
            {hidden ? "Unhide Account" : "Hide Account"}
          </DialogTitle>
          <DialogDescription className="mt-3 max-w-[567px] text-small text-brand-ink">
            {hidden ? (
              <>
                Are you sure you want to unhide this account?{" "}
                <span className="font-semibold">{name}</span> will be visible to
                other users again.
              </>
            ) : (
              <>
                Are you sure you want to hide this account?{" "}
                <span className="font-semibold">{name}</span> will no longer be
                visible to other users.
              </>
            )}
          </DialogDescription>
          <div className="mt-6 flex w-full max-w-[320px] flex-col gap-3">
            <Button
              type="button"
              onClick={onConfirm}
              className={cn(
                "h-11 w-full rounded-[8px] text-small font-semibold text-white",
                hidden
                  ? "bg-accent-1 hover:bg-accent-1/90"
                  : "bg-accent-2 hover:bg-accent-2/90"
              )}
            >
              {hidden ? (
                <>
                  <Eye className="size-4" /> Unhide Account
                </>
              ) : (
                <>
                  <EyeOff className="size-4" /> Hide Account
                </>
              )}
            </Button>
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full rounded-[8px] border-brand-border text-small font-medium text-brand-ink hover:bg-brand-container"
              >
                Cancel
              </Button>
            </DialogClose>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
