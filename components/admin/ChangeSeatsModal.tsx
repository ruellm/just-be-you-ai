"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { MAX_SEATS_TOTAL } from "@/lib/admin";
import { setCompanySeats } from "@/app/admin/companies/actions";
import { setCandidateSeats } from "@/app/admin/users/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

const LABEL_CLASS =
  "mb-1.5 text-xs font-semibold tracking-[1.2px] text-brand-ink uppercase";
const STEP_BTN =
  "flex size-12 items-center justify-center rounded-[12px] bg-brand-container text-brand-ink hover:bg-brand-border/60";
const COUNT_BOX =
  "flex h-12 items-center justify-center rounded-[12px] border-[0.8px] border-brand-border text-xl font-bold text-brand-ink";

export function ChangeSeatsModal({
  open,
  onOpenChange,
  subject,
  targetId,
  seatsUsed,
  seatsTotal,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject: "business" | "candidate";
  targetId: string;
  seatsUsed: number;
  seatsTotal: number;
}) {
  const router = useRouter();
  const floor = Math.min(seatsUsed, MAX_SEATS_TOTAL);
  const overCap = seatsUsed > seatsTotal;
  const initial = Math.max(seatsTotal, floor);
  const [seats, setSeats] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const subjectLabel = subject === "business" ? "Business" : "Candidate";
  const usedLabel = subject === "business" ? "Profile unlocks used" : "Interview seats used";

  useEffect(() => {
    if (open) {
      setSeats(initial);
      setError(null);
    }
  }, [open, initial]);

  function submit() {
    setError(null);
    startTransition(async () => {
      const result =
        subject === "business"
          ? await setCompanySeats(targetId, seats)
          : await setCandidateSeats(targetId, seats);
      if (result.ok) {
        toast.success(`Seats updated to ${result.seatsTotal}.`);
        onOpenChange(false);
        router.refresh();
        return;
      }
      if (result.reason === "below_used") {
        setError(
          `Cannot set seats to ${result.requested}: this ${subjectLabel.toLowerCase()} has already used ${result.seatsUsed} seat${result.seatsUsed === 1 ? "" : "s"}. The total must be at least ${result.seatsUsed}.`
        );
        return;
      }
      setError(result.error);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setSeats(initial);
          setError(null);
        }
        onOpenChange(next);
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="w-full max-w-[calc(100%-2rem)] gap-0 rounded-[16px] bg-brand-surface p-0 font-body ring-0 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)] sm:max-w-[512px]"
      >
        <div className="flex items-center gap-3 px-6 pt-6 pb-5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-[8px] bg-brand-secondary">
            <Image
              src="/icons/seat-chair.svg"
              alt=""
              width={18}
              height={21}
              unoptimized
              className="brightness-0 invert"
            />
          </div>
          <DialogTitle className="text-xl leading-7 font-semibold text-brand-primary">
            Change Seats for {subjectLabel}
          </DialogTitle>
          <DialogClose
            aria-label="Close"
            className="ml-auto text-2xl leading-none text-brand-ink hover:text-brand-primary"
          >
            ×
          </DialogClose>
        </div>
        <div className="mx-6 h-px bg-brand-border" />
        <div className="px-6 pt-5 pb-6">
          <div className="flex flex-wrap gap-6">
            <div>
              <p className={LABEL_CLASS}>Current Seats</p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-label="Decrease seats"
                  onClick={() => setSeats((s) => Math.max(floor, s - 1))}
                  disabled={seats <= floor}
                  className={`${STEP_BTN} disabled:cursor-not-allowed disabled:opacity-40`}
                >
                  <Minus className="size-4" />
                </button>
                <div className={`${COUNT_BOX} w-20`}>{seats}</div>
                <button
                  type="button"
                  aria-label="Increase seats"
                  onClick={() => setSeats((s) => Math.min(MAX_SEATS_TOTAL, s + 1))}
                  disabled={seats >= MAX_SEATS_TOTAL}
                  className={`${STEP_BTN} disabled:cursor-not-allowed disabled:opacity-40`}
                >
                  <Plus className="size-4" />
                </button>
              </div>
              <p className="mt-3 text-xs text-brand-ink-secondary">
                {usedLabel}: {seatsUsed} of {seatsTotal}
              </p>
            </div>
            <div className="px-5">
              <p className={LABEL_CLASS}>Max Seat Limit</p>
              <div className={`${COUNT_BOX} w-[131px]`}>{MAX_SEATS_TOTAL}</div>
              <p className="mt-3 text-xs text-brand-ink-secondary">
                Total plan limit
              </p>
            </div>
          </div>

          {overCap ? (
            <p className="mt-4 text-sm font-medium text-amber-700">
              This {subjectLabel.toLowerCase()} has used {seatsUsed} seats but
              only has {seatsTotal}. Set the total to at least {seatsUsed} to
              clear the deficit.
            </p>
          ) : null}
          {error ? (
            <p className="mt-4 text-sm font-medium text-accent-2">{error}</p>
          ) : null}

          <div className="mt-4 h-px bg-brand-border" />
          <div className="mt-5 flex items-center justify-end gap-3">
            <DialogClose asChild>
              <Button
                type="button"
                variant="ghost"
                className="h-9 rounded-[8px] px-5 text-sm font-medium text-brand-ink hover:bg-brand-container"
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              onClick={submit}
              disabled={pending || seats < floor}
              className="h-10 rounded-[8px] bg-brand-secondary px-5 text-sm font-semibold text-white hover:bg-brand-secondary/90"
            >
              {pending ? "Updating…" : "Update Seats"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
