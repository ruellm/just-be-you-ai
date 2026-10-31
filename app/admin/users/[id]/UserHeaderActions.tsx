"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Eye, EyeOff, Pencil } from "lucide-react";
import type { Role } from "@prisma/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  BTN_DANGER,
  BTN_INK,
  BTN_PRIMARY,
} from "@/app/candidate/profile/ProfileSectionCard";
import type { CandidateTier } from "@prisma/client";
import { ChangeSeatsModal } from "@/components/admin/ChangeSeatsModal";
import { TierToggle } from "./TierToggle";
import { HideUserDialog } from "@/components/admin/HideUserDialog";

const BTN_UNDO = cn(
  "h-[35px] rounded-[8px] px-4 font-body text-small font-semibold text-white",
  "bg-accent-1 hover:bg-accent-1/90"
);

export function UserHeaderActions({
  userId,
  name,
  role,
  candidateProfileId,
  candidateTier,
  companyId,
  seatsUsed,
  seatsTotal,
}: {
  userId: string;
  name: string;
  role: Role;
  candidateProfileId: string | null;
  candidateTier: CandidateTier | null;
  companyId: string | null;
  seatsUsed: number;
  seatsTotal: number;
}) {
  const [seatsOpen, setSeatsOpen] = useState(false);
  const [hideOpen, setHideOpen] = useState(false);
  const [hidden, setHidden] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button asChild className={BTN_PRIMARY}>
        <Link href={`/admin/users/${userId}/edit`}>
          <Pencil className="size-4" /> Edit User
        </Link>
      </Button>
      {role === "candidate" && candidateProfileId ? (
        <Button
          type="button"
          onClick={() => setSeatsOpen(true)}
          className={BTN_INK}
        >
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
      ) : role === "business" && companyId ? (
        <Button asChild className={BTN_INK}>
          <Link href={`/admin/companies/${companyId}`}>
            <Image
              src="/icons/seat-chair.svg"
              alt=""
              width={16}
              height={19}
              unoptimized
              className="brightness-0 invert"
            />
            Manage Seats on Company
          </Link>
        </Button>
      ) : null}
      {/* Candidates only — business/admin have no candidate tier. */}
      {role === "candidate" && candidateProfileId && candidateTier ? (
        <TierToggle
          candidateProfileId={candidateProfileId}
          tier={candidateTier}
        />
      ) : null}
      <Button
        type="button"
        onClick={() => setHideOpen(true)}
        className={hidden ? BTN_UNDO : BTN_DANGER}
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

      {role === "candidate" && candidateProfileId ? (
        <ChangeSeatsModal
          open={seatsOpen}
          onOpenChange={setSeatsOpen}
          subject="candidate"
          targetId={candidateProfileId}
          seatsUsed={seatsUsed}
          seatsTotal={seatsTotal}
        />
      ) : null}
      <HideUserDialog
        open={hideOpen}
        onOpenChange={setHideOpen}
        hidden={hidden}
        name={name}
        subject="user"
        onConfirm={() => {
          setHidden((v) => !v);
          setHideOpen(false);
        }}
      />
    </div>
  );
}
