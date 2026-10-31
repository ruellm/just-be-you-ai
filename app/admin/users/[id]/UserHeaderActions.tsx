"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Pencil } from "lucide-react";
import type { Role } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  BTN_INK,
  BTN_PRIMARY,
} from "@/app/candidate/profile/ProfileSectionCard";
import type { CandidateTier } from "@prisma/client";
import { ChangeSeatsModal } from "@/components/admin/ChangeSeatsModal";
import { HideAccountButton } from "@/components/admin/HideAccountButton";
import { TierToggle } from "./TierToggle";

export function UserHeaderActions({
  userId,
  name,
  role,
  candidateProfileId,
  candidateTier,
  companyId,
  hidden,
  seatsUsed,
  seatsTotal,
}: {
  userId: string;
  name: string;
  role: Role;
  candidateProfileId: string | null;
  candidateTier: CandidateTier | null;
  companyId: string | null;
  hidden: boolean;
  seatsUsed: number;
  seatsTotal: number;
}) {
  const [seatsOpen, setSeatsOpen] = useState(false);

  // A business account is hidden through its company; admins are never hidden.
  const hideTarget =
    role === "candidate" && candidateProfileId
      ? { target: "candidate" as const, id: candidateProfileId }
      : role === "business" && companyId
        ? { target: "company" as const, id: companyId }
        : null;

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
      {hideTarget ? (
        <HideAccountButton
          target={hideTarget.target}
          targetId={hideTarget.id}
          name={name}
          hidden={hidden}
          variant="header"
        />
      ) : null}

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
    </div>
  );
}
