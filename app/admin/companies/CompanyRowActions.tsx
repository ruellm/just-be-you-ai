"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { HideUserDialog } from "@/components/admin/HideUserDialog";
import { ACTION_BTN } from "@/components/data-table/TableCard";

const ROW_BTN = cn(ACTION_BTN, "font-medium");

export function CompanyRowActions({
  companyId,
  name,
}: {
  companyId: string;
  name: string;
}) {
  const [hidden, setHidden] = useState(false);
  const [hideOpen, setHideOpen] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        asChild
        size="sm"
        className={cn(ROW_BTN, "bg-brand-secondary hover:bg-brand-secondary/90")}
      >
        <Link href={`/admin/companies/${companyId}`}>View Profile</Link>
      </Button>
      <Button
        type="button"
        size="sm"
        onClick={() => setHideOpen(true)}
        className={cn(
          ROW_BTN,
          hidden
            ? "bg-accent-1 hover:bg-accent-1/90"
            : "bg-accent-2 hover:bg-accent-2/90"
        )}
      >
        {hidden ? "Unhide Account" : "Hide Account"}
      </Button>

      <HideUserDialog
        open={hideOpen}
        onOpenChange={setHideOpen}
        hidden={hidden}
        name={name}
        onConfirm={() => {
          setHidden((v) => !v);
          setHideOpen(false);
        }}
      />
    </div>
  );
}
