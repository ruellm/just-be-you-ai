"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Eye, EyeOff, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  BTN_DANGER,
  BTN_INK,
  BTN_PRIMARY,
} from "@/app/candidate/profile/ProfileSectionCard";
import { ChangeSeatsModal } from "@/components/admin/ChangeSeatsModal";
import { HideUserDialog } from "@/components/admin/HideUserDialog";

const BTN_UNDO = cn(
  "h-[35px] rounded-[8px] px-4 font-body text-sm font-semibold text-white",
  "bg-accent-1 hover:bg-accent-1/90"
);

export function UserHeaderActions({
  userId,
  name,
}: {
  userId: string;
  name: string;
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
      <Button
        type="button"
        onClick={() => setHideOpen(true)}
        className={hidden ? BTN_UNDO : BTN_DANGER}
      >
        {hidden ? (
          <>
            <Eye className="size-4" /> Unhide User
          </>
        ) : (
          <>
            <EyeOff className="size-4" /> Hide User
          </>
        )}
      </Button>

      <ChangeSeatsModal open={seatsOpen} onOpenChange={setSeatsOpen} />
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
