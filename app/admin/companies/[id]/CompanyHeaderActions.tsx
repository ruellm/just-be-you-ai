"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  BTN_INK,
  BTN_PRIMARY,
} from "@/app/candidate/profile/ProfileSectionCard";
import { ChangeSeatsModal } from "@/components/admin/ChangeSeatsModal";
import { HideAccountButton } from "@/components/admin/HideAccountButton";

export function CompanyHeaderActions({
  companyId,
  name,
  hidden,
  seatsUsed,
  seatsTotal,
}: {
  companyId: string;
  name: string;
  hidden: boolean;
  seatsUsed: number;
  seatsTotal: number;
}) {
  const [seatsOpen, setSeatsOpen] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button asChild className={BTN_PRIMARY}>
        <Link href={`/admin/companies/${companyId}/edit`}>
          <Pencil className="size-4" /> Edit Company
        </Link>
      </Button>
      <Button type="button" onClick={() => setSeatsOpen(true)} className={BTN_INK}>
        <Image
          src="/icons/seat-chair.svg"
          alt=""
          width={16}
          height={19}
          unoptimized
          className="brightness-0 invert"
        />
        Change Seats
      </Button>
      <HideAccountButton
        target="company"
        targetId={companyId}
        name={name}
        hidden={hidden}
        variant="header"
      />

      <ChangeSeatsModal
        open={seatsOpen}
        onOpenChange={setSeatsOpen}
        subject="business"
        targetId={companyId}
        seatsUsed={seatsUsed}
        seatsTotal={seatsTotal}
      />
    </div>
  );
}
