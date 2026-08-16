"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronDown, Minus, Plus } from "lucide-react";
import { SEATS } from "@/lib/admin";
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
  subject = "user",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject?: "user" | "business";
}) {
  const [seats, setSeats] = useState(SEATS.current);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setSeats(SEATS.current);
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
            Change Seats for {subject === "business" ? "Business" : "User"}
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
          <p className={LABEL_CLASS}>
            Current Plan <span className="text-accent-2">*</span>
          </p>
          <div className="flex h-[42px] items-center justify-between rounded-[8px] border-[0.8px] border-brand-border px-4 text-sm font-medium text-brand-ink-secondary">
            {SEATS.plan}
            <ChevronDown className="size-4 text-brand-ink-secondary" />
          </div>

          <div className="mt-4 flex flex-wrap gap-6">
            <div>
              <p className={LABEL_CLASS}>Current Seats</p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-label="Decrease seats"
                  onClick={() => setSeats((s) => Math.max(0, s - 1))}
                  className={STEP_BTN}
                >
                  <Minus className="size-4" />
                </button>
                <div className={`${COUNT_BOX} w-20`}>{seats}</div>
                <button
                  type="button"
                  aria-label="Increase seats"
                  onClick={() => setSeats((s) => Math.min(SEATS.max, s + 1))}
                  className={STEP_BTN}
                >
                  <Plus className="size-4" />
                </button>
              </div>
              <p className="mt-3 text-xs text-brand-ink-secondary">
                Reveals used this cycle
              </p>
            </div>
            <div className="px-5">
              <p className={LABEL_CLASS}>Max Seat Limit</p>
              <div className={`${COUNT_BOX} w-[131px]`}>{SEATS.max}</div>
              <p className="mt-3 text-xs text-brand-ink-secondary">
                Total plan limit
              </p>
            </div>
          </div>

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
              onClick={() => onOpenChange(false)}
              className="h-10 rounded-[8px] bg-brand-secondary px-5 text-sm font-semibold text-white hover:bg-brand-secondary/90"
            >
              Update Seats
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
