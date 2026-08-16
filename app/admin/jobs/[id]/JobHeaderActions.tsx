"use client";

import { useState } from "react";
import Link from "next/link";
import { CircleX, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  BTN_DANGER,
  BTN_INK,
  BTN_PRIMARY,
} from "@/app/candidate/profile/ProfileSectionCard";

export function JobHeaderActions({
  jobId,
  title,
  companyName,
  status,
}: {
  jobId: string;
  title: string;
  companyName: string;
  status: "open" | "closed";
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button asChild className={BTN_PRIMARY}>
        <Link href={`/admin/jobs/${jobId}/edit`}>
          <Pencil className="size-4" /> Edit Job
        </Link>
      </Button>
      <Button type="button" disabled className={BTN_INK}>
        {status === "open" ? (
          <>
            <CircleX className="size-4" /> Close
          </>
        ) : (
          <>
            <RotateCcw className="size-4" /> Reopen
          </>
        )}
      </Button>
      <Button
        type="button"
        onClick={() => setDeleteOpen(true)}
        className={BTN_DANGER}
      >
        <Trash2 className="size-4" /> Delete
      </Button>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="w-full max-w-[calc(100%-2rem)] gap-0 rounded-[16px] bg-brand-surface p-8 font-body ring-0 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)] sm:max-w-[576px]">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-status-fail text-accent-2">
            <Trash2 className="size-7" />
          </div>
          <AlertDialogHeader className="items-center gap-2 pt-5 text-center sm:text-center">
            <AlertDialogTitle className="font-body text-xl font-semibold text-brand-ink">
              Are you sure?
            </AlertDialogTitle>
            <AlertDialogDescription className="font-body text-sm leading-[21px] text-brand-ink">
              This action cannot be undone. The job posting{" "}
              <span className="font-semibold">&quot;{title}&quot;</span> at{" "}
              {companyName} will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mx-auto mt-6 flex w-full max-w-[320px] flex-col gap-3 sm:flex-col sm:justify-stretch">
            <Button
              type="button"
              disabled
              className={cn(
                "h-auto w-full rounded-[8px] bg-accent-2 py-3 font-body text-sm font-semibold text-white hover:bg-accent-2/90"
              )}
            >
              Delete Job Posting
            </Button>
            <AlertDialogCancel className="h-auto w-full rounded-[8px] border-[0.8px] border-brand-border bg-brand-surface py-3 font-body text-sm font-medium text-brand-ink hover:bg-brand-container">
              Cancel
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
