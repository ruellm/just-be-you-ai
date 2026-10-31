"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Role } from "@prisma/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { HideAccountButton } from "@/components/admin/HideAccountButton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ACTION_BTN } from "@/components/data-table/TableCard";
import { adminProfilePath } from "@/lib/admin";
import { changeUserRole } from "./actions";

const ROW_BTN = cn(ACTION_BTN, "font-medium");

export function UserRowActions({
  userId,
  role,
  name,
  candidateProfileId,
  companyId,
  hidden,
}: {
  userId: string;
  role: Role;
  name: string;
  candidateProfileId: string | null;
  companyId: string | null;
  hidden: boolean;
}) {
  const router = useRouter();
  const [roleOpen, setRoleOpen] = useState(false);
  const [value, setValue] = useState<Role>(role);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const result = await changeUserRole(userId, value);
      if (!result.success) {
        toast.error(result.error ?? "Could not update role.");
        return;
      }
      toast.success("Role updated");
      setRoleOpen(false);
      router.refresh();
    });
  }

  // A business account is hidden through its company; admins are never hidden.
  const hideTarget =
    role === "candidate" && candidateProfileId
      ? { target: "candidate" as const, id: candidateProfileId }
      : role === "business" && companyId
        ? { target: "company" as const, id: companyId }
        : null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        asChild
        size="sm"
        className={cn(ROW_BTN, "bg-brand-secondary hover:bg-brand-secondary/90")}
      >
        <Link href={adminProfilePath({ id: userId, role, companyId })}>
          View Profile
        </Link>
      </Button>
      <Button
        type="button"
        size="sm"
        onClick={() => {
          setValue(role);
          setRoleOpen(true);
        }}
        className={cn(ROW_BTN, "bg-brand-ink hover:bg-brand-ink/90")}
      >
        Change Role
      </Button>
      {hideTarget ? (
        <HideAccountButton
          target={hideTarget.target}
          targetId={hideTarget.id}
          name={name}
          hidden={hidden}
          variant="row"
        />
      ) : null}

      <Dialog open={roleOpen} onOpenChange={setRoleOpen}>
        <DialogContent className="rounded-[16px] font-body sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-subheading font-semibold tracking-[-0.5px] text-brand-primary">
              Change role
            </DialogTitle>
            <DialogDescription className="text-small text-brand-ink-secondary">
              Update the role for {name}.
            </DialogDescription>
          </DialogHeader>
          <Select value={value} onValueChange={(v) => setValue(v as Role)}>
            <SelectTrigger className="h-10 w-full rounded-[12px] border-brand-border font-body">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-[12px] border-brand-border font-body">
              <SelectItem value="candidate">Candidate</SelectItem>
              <SelectItem value="business">Business</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
          <DialogFooter>
            <DialogClose asChild>
              <Button
                type="button"
                variant="ghost"
                className="h-9 rounded-[8px] px-5 text-small font-medium text-brand-ink hover:bg-brand-container"
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              onClick={save}
              disabled={pending}
              className="h-9 rounded-[8px] bg-brand-secondary px-5 text-small font-semibold text-white hover:bg-brand-secondary/90"
            >
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
