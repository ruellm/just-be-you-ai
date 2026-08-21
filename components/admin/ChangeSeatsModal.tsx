"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Info, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { MAX_SEATS_TOTAL } from "@/lib/admin";
import {
  CANDIDATE_SEAT_INFO,
  COMPANY_SEAT_INFO,
  formatSeatsLeft,
  seatsRemaining,
} from "@/lib/interview-seats";
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
  "mb-1.5 text-meta font-semibold tracking-[1.2px] text-brand-ink uppercase";
const STEP_BTN =
  "flex size-12 items-center justify-center rounded-[12px] bg-brand-container text-brand-ink hover:bg-brand-border/60 disabled:cursor-not-allowed disabled:opacity-40";
const COUNT_BOX =
  "flex h-12 w-20 items-center justify-center rounded-[12px] border-[0.8px] border-brand-border text-subheading font-bold text-brand-ink";

function Stepper({
  label,
  value,
  onDecrease,
  onIncrease,
  canDecrease,
  canIncrease,
  hint,
}: {
  label: string;
  value: number;
  onDecrease: () => void;
  onIncrease: () => void;
  canDecrease: boolean;
  canIncrease: boolean;
  hint?: string;
}) {
  return (
    <div>
      <p className={LABEL_CLASS}>{label}</p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={`Decrease ${label.toLowerCase()}`}
          onClick={onDecrease}
          disabled={!canDecrease}
          className={STEP_BTN}
        >
          <Minus className="size-4" />
        </button>
        <div className={COUNT_BOX}>{value}</div>
        <button
          type="button"
          aria-label={`Increase ${label.toLowerCase()}`}
          onClick={onIncrease}
          disabled={!canIncrease}
          className={STEP_BTN}
        >
          <Plus className="size-4" />
        </button>
      </div>
      {hint ? (
        <p className="mt-3 text-meta text-brand-ink-secondary">{hint}</p>
      ) : null}
    </div>
  );
}

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
  const [total, setTotal] = useState(seatsTotal);
  const [used, setUsed] = useState(seatsUsed);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const subjectLabel = subject === "business" ? "Business" : "Candidate";
  const info = subject === "business" ? COMPANY_SEAT_INFO : CANDIDATE_SEAT_INFO;
  const left = seatsRemaining(used, total);
  const overCap = used > total;

  useEffect(() => {
    if (open) {
      setTotal(seatsTotal);
      setUsed(seatsUsed);
      setError(null);
    }
  }, [open, seatsTotal, seatsUsed]);

  function submit() {
    setError(null);
    startTransition(async () => {
      const input = { total, used };
      const result =
        subject === "business"
          ? await setCompanySeats(targetId, input)
          : await setCandidateSeats(targetId, input);
      if (result.ok) {
        toast.success(
          `Seats updated: ${formatSeatsLeft(result.seatsRemaining, result.seatsTotal)}.`
        );
        onOpenChange(false);
        router.refresh();
        return;
      }
      if (result.reason === "below_used") {
        setError(
          `Max seats cannot be set to ${result.requested}: this ${subjectLabel.toLowerCase()} has ${result.seatsUsed} seat${result.seatsUsed === 1 ? "" : "s"} used. Raise the max or lower seats used.`
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
          setTotal(seatsTotal);
          setUsed(seatsUsed);
          setError(null);
        }
        onOpenChange(next);
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="w-full max-w-[calc(100%-2rem)] gap-0 rounded-[16px] bg-brand-surface p-0 font-body ring-0 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)] sm:max-w-[560px]"
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
          <DialogTitle className="text-subheading font-semibold text-brand-primary">
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
          <div className="flex items-center justify-between gap-4 rounded-[12px] border-[0.8px] border-brand-border bg-brand-container px-4 py-3">
            <span className="text-body font-semibold text-brand-ink">
              {formatSeatsLeft(left, total)}
            </span>
            <span className="text-small text-brand-ink-secondary">
              {used} used
            </span>
          </div>
          <p className="mt-3 flex items-start gap-2 text-meta text-brand-ink-secondary">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            {info}
          </p>

          <div className="mt-5 flex flex-wrap gap-6">
            <Stepper
              label="Max Seats"
              value={total}
              onDecrease={() => setTotal((t) => Math.max(used, t - 1))}
              onIncrease={() => setTotal((t) => Math.min(MAX_SEATS_TOTAL, t + 1))}
              canDecrease={total > used}
              canIncrease={total < MAX_SEATS_TOTAL}
              hint={`Plan limit ${MAX_SEATS_TOTAL}`}
            />
            <Stepper
              label="Seats Used"
              value={used}
              onDecrease={() => setUsed((u) => Math.max(0, u - 1))}
              onIncrease={() => setUsed((u) => Math.min(total, u + 1))}
              canDecrease={used > 0}
              canIncrease={used < total}
            />
            <Stepper
              label="Seats Left"
              value={left}
              onDecrease={() => setUsed((u) => Math.min(total, u + 1))}
              onIncrease={() => setUsed((u) => Math.max(0, u - 1))}
              canDecrease={!overCap && left > 0}
              canIncrease={!overCap && used > 0}
            />
          </div>

          {overCap ? (
            <p className="mt-4 text-small font-medium text-amber-700">
              This {subjectLabel.toLowerCase()} has {used} seats used but only
              {" "}{total} max. Raise the max to at least {used} or lower seats
              used to clear the deficit.
            </p>
          ) : null}
          {error ? (
            <p className="mt-4 text-small font-medium text-accent-2">{error}</p>
          ) : null}

          <div className="mt-4 h-px bg-brand-border" />
          <div className="mt-5 flex items-center justify-end gap-3">
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
              type="button"
              onClick={submit}
              disabled={pending || overCap}
              className="h-10 rounded-[8px] bg-brand-secondary px-5 text-small font-semibold text-white hover:bg-brand-secondary/90"
            >
              {pending ? "Updating…" : "Update Seats"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
