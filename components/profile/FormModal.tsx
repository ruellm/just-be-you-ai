"use client";

import type { ComponentProps, ReactNode } from "react";
import { Calendar, X, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Shared shell for the profile's form modals (Education / Work Experience /
// Project / Add Skill / Edit Skill Years). Visual only — the Dialog open/close
// state and the forms inside are owned by the callers.
//
//   <FormModalContent icon={GraduationCap} title="Add Education">
//     <form …>
//       <FormModalBody>…fields…</FormModalBody>
//       <FormModalFooter saveLabel="Save Education" pending={…} />
//     </form>
//   </FormModalContent>

// ── Field styling (apply to shadcn Form primitives) ─────────────────────────
export const MODAL_LABEL =
  "pb-1.5 font-body text-xs font-semibold tracking-[1.2px] text-brand-ink uppercase";
export const MODAL_INPUT =
  "h-[42px] rounded-[8px] border-[0.8px] border-brand-border bg-brand-surface px-4 py-2.5 font-body text-sm text-brand-ink shadow-none placeholder:text-brand-border";
export const MODAL_TEXTAREA =
  "rounded-[8px] border-[0.8px] border-brand-border bg-brand-surface px-4 py-2.5 font-body text-sm text-brand-ink shadow-none placeholder:text-brand-border";
export const MODAL_CHECKBOX =
  "size-4 rounded-[4px] border-[0.8px] border-brand-border shadow-none data-[state=checked]:border-brand-secondary data-[state=checked]:bg-brand-secondary";
export const MODAL_CHECK_LABEL = "font-body text-sm font-normal text-brand-ink";
// Two-column pair (single column on small screens).
export const MODAL_PAIR = "grid gap-4 sm:grid-cols-2";

// Trailing required marker for labels.
export function Req() {
  return (
    <span aria-hidden className="text-accent-2">
      {" "}
      *
    </span>
  );
}

// Native date input styled like MODAL_INPUT with a calendar icon on the
// right. The native picker indicator is stretched invisibly over the whole
// field so clicking anywhere still opens the picker.
export function ModalDateInput({
  className,
  ...props
}: Omit<ComponentProps<typeof Input>, "type">) {
  return (
    <div className="relative">
      <Input
        type="date"
        className={cn(
          MODAL_INPUT,
          "relative pr-10 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0",
          className
        )}
        {...props}
      />
      <Calendar
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-brand-ink-secondary"
      />
    </div>
  );
}

// ── Shell pieces ────────────────────────────────────────────────────────────
export function FormModalContent({
  icon: Icon,
  title,
  size = "default",
  className,
  children,
}: {
  icon: LucideIcon;
  title: ReactNode;
  size?: "default" | "sm";
  className?: string;
  children: ReactNode;
}) {
  return (
    <DialogContent
      showCloseButton={false}
      className={cn(
        "max-h-[90vh] gap-0 overflow-y-auto rounded-[16px] bg-brand-surface p-0 font-body ring-0 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)]",
        size === "sm" ? "sm:max-w-[420px]" : "sm:max-w-[512px]",
        className
      )}
    >
      <DialogHeader className="flex-row items-center gap-3 space-y-0 px-6 pt-6 pb-5">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-brand-secondary text-white">
          <Icon className="size-5" />
        </div>
        <DialogTitle className="flex-1 font-body text-xl leading-none font-semibold text-brand-primary">
          {title}
        </DialogTitle>
        <DialogClose asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Close"
            className="text-brand-ink-secondary hover:bg-brand-container hover:text-brand-ink"
          >
            <X />
          </Button>
        </DialogClose>
      </DialogHeader>
      <div className="mx-6 border-t border-brand-border" />
      {children}
    </DialogContent>
  );
}

export function FormModalBody({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("space-y-4 px-6 pt-5 pb-6", className)}>{children}</div>
  );
}

// Divider + Cancel (closes the dialog) + Save (submits the enclosing form).
export function FormModalFooter({
  saveLabel,
  pending,
  onSave,
  saveType = "submit",
}: {
  saveLabel: string;
  pending?: boolean;
  onSave?: () => void;
  saveType?: "submit" | "button";
}) {
  return (
    <div className="px-6 pb-6">
      <div className="border-t border-brand-border" />
      <div className="flex justify-end gap-3 pt-5">
        <DialogClose asChild>
          <Button
            type="button"
            variant="ghost"
            className="h-9 rounded-[8px] px-5 font-body text-sm font-medium text-brand-ink hover:bg-brand-container"
          >
            Cancel
          </Button>
        </DialogClose>
        <Button
          type={saveType}
          onClick={onSave}
          disabled={pending}
          className="h-10 rounded-[8px] bg-brand-secondary px-5 font-body text-sm font-semibold text-white hover:bg-brand-secondary/90"
        >
          {pending ? "Saving…" : saveLabel}
        </Button>
      </div>
    </div>
  );
}
