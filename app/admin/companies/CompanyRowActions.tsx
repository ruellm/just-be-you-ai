"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { HideAccountButton } from "@/components/admin/HideAccountButton";
import { ACTION_BTN } from "@/components/data-table/TableCard";

const ROW_BTN = cn(ACTION_BTN, "font-medium");

export function CompanyRowActions({
  companyId,
  name,
  hidden,
}: {
  companyId: string;
  name: string;
  hidden: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        asChild
        size="sm"
        className={cn(ROW_BTN, "bg-brand-secondary hover:bg-brand-secondary/90")}
      >
        <Link href={`/admin/companies/${companyId}`}>View Profile</Link>
      </Button>
      <HideAccountButton
        target="company"
        targetId={companyId}
        name={name}
        hidden={hidden}
        variant="row"
      />
    </div>
  );
}
