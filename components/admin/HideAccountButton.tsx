"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ACTION_BTN } from "@/components/data-table/TableCard";
import { BTN_DANGER } from "@/app/candidate/profile/ProfileSectionCard";
import { hideCompany, unhideCompany } from "@/app/admin/companies/actions";
import { hideCandidate, unhideCandidate } from "@/app/admin/users/actions";
import { HideUserDialog } from "./HideUserDialog";

const HEADER_UNDO = cn(
  "h-[35px] rounded-[8px] px-4 font-body text-small font-semibold text-white",
  "bg-accent-1 hover:bg-accent-1/90"
);
const ROW_BTN = cn(ACTION_BTN, "font-medium");

// Hide / Unhide Account button plus its confirmation. `target` is the
// candidate profile or the company the flag lives on; a business user's
// account maps to their company.
export function HideAccountButton({
  target,
  targetId,
  name,
  hidden,
  variant,
}: {
  target: "candidate" | "company";
  targetId: string;
  name: string;
  hidden: boolean;
  variant: "row" | "header";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function confirm(reason: string) {
    startTransition(async () => {
      const result = hidden
        ? target === "candidate"
          ? await unhideCandidate(targetId)
          : await unhideCompany(targetId)
        : target === "candidate"
          ? await hideCandidate(targetId, reason)
          : await hideCompany(targetId, reason);
      if (!result.success) {
        toast.error(result.error ?? "Could not update the account.");
        return;
      }
      toast.success(hidden ? "Account unhidden" : "Account hidden");
      setOpen(false);
      router.refresh();
    });
  }

  const className =
    variant === "row"
      ? cn(
          ROW_BTN,
          hidden
            ? "bg-accent-1 hover:bg-accent-1/90"
            : "bg-accent-2 hover:bg-accent-2/90"
        )
      : hidden
        ? HEADER_UNDO
        : BTN_DANGER;

  return (
    <>
      <Button
        type="button"
        size={variant === "row" ? "sm" : "default"}
        onClick={() => setOpen(true)}
        className={className}
      >
        {variant === "header" ? (
          hidden ? (
            <Eye className="size-4" />
          ) : (
            <EyeOff className="size-4" />
          )
        ) : null}
        {hidden ? "Unhide Account" : "Hide Account"}
      </Button>
      <HideUserDialog
        open={open}
        onOpenChange={(next) => {
          if (!next && pending) return;
          setOpen(next);
        }}
        hidden={hidden}
        name={name}
        subject={target === "candidate" ? "user" : "company"}
        pending={pending}
        onConfirm={confirm}
      />
    </>
  );
}
