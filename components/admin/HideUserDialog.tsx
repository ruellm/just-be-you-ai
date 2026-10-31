"use client";

import { useEffect, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { HIDE_REASON_MAX } from "@/lib/admin";

// Hide / unhide confirmation for a user or a company. Hiding a user takes an
// optional reason, stored with the hide for the notification that is not
// built yet.
export function HideUserDialog({
  open,
  onOpenChange,
  hidden,
  name,
  subject = "user",
  pending = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hidden: boolean;
  name: string;
  subject?: "user" | "company";
  pending?: boolean;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  const label = subject === "company" ? "Company Profile" : "User Profile";
  const askReason = subject === "user" && !hidden;

  useEffect(() => {
    if (open) setReason("");
  }, [open]);

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
            {hidden ? `Unhide ${label}` : `Hide ${label}`}
          </DialogTitle>
          <DialogDescription className="mt-3 max-w-[567px] text-small text-brand-ink">
            {hidden ? (
              <>
                Are you sure you want to unhide this{" "}
                {subject === "company" ? "company" : "user"} profile?{" "}
                <span className="font-semibold">{name}</span> will be visible to
                other {subject === "company" ? "users" : "companies"} again.
              </>
            ) : subject === "company" ? (
              <>
                Are you sure you want to hide this company profile?{" "}
                <span className="font-semibold">{name}</span> will no longer be
                visible to other users.
              </>
            ) : (
              <>
                Are you sure you want to hide this user profile?{" "}
                <span className="font-semibold">{name}</span> will no longer be
                visible to other companies. You may also add a reason below so
                they will be notified of their status.
              </>
            )}
          </DialogDescription>
          {askReason ? (
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              aria-label="Reason"
              maxLength={HIDE_REASON_MAX}
              disabled={pending}
              className="mt-5 min-h-[153px] w-full resize-y rounded-[12px] border-brand-border bg-brand-surface px-4 py-3 font-body text-small text-brand-ink shadow-none"
            />
          ) : null}
          <div className="mt-6 flex w-full max-w-[320px] flex-col gap-3">
            <Button
              type="button"
              disabled={pending}
              onClick={() => onConfirm(reason.trim())}
              className={cn(
                "h-11 w-full rounded-[8px] text-small font-semibold text-white",
                hidden
                  ? "bg-accent-1 hover:bg-accent-1/90"
                  : "bg-accent-2 hover:bg-accent-2/90"
              )}
            >
              {pending ? (
                "Saving…"
              ) : hidden ? (
                <>
                  <Eye className="size-4" /> Unhide {label}
                </>
              ) : (
                <>
                  <EyeOff className="size-4" /> Hide {label}
                </>
              )}
            </Button>
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
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
