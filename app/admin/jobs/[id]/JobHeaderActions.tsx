"use client";

import Link from "next/link";
import { CircleX, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { BTN_PRIMARY } from "@/app/candidate/profile/ProfileSectionCard";

// S11 — UI ONLY. Close/Reopen and Delete both end in a toast:
//   * toggleJobStatus is company-scoped and there is NO admin variant.
//   * deleteJob does not exist, and deliberately so — deleting a Job cascades
//     to JobSkill, Application, and through Application to InterviewResult and
//     GeneratedQuestion. That cascade decision has not been made, so nothing
//     here may be wired to a mutation.
// Per the round rule these are NOT disabled: they look and behave real right up
// to the point of mutation, then toast.

const BTN_CLOSE =
  "h-[35px] min-w-[94px] rounded-[5px] px-4 font-body text-small font-medium text-brand-canvas bg-brand-ink hover:bg-brand-ink/90";
const BTN_DELETE =
  "h-[35px] min-w-[92px] rounded-[5px] px-4 font-body text-small font-medium text-white bg-accent-2 hover:bg-accent-2/90";

export function JobHeaderActions({
  jobId,
  title,
  companyName,
  status,
  applicationCount,
}: {
  jobId: string;
  title: string;
  companyName: string;
  status: "open" | "closed";
  applicationCount: number;
}) {
  const isOpen = status === "open";

  const closeButton = (
    <Button type="button" className={BTN_CLOSE}>
      {isOpen ? (
        <>
          <CircleX className="size-4" /> Close
        </>
      ) : (
        <>
          <RotateCcw className="size-4" /> Reopen
        </>
      )}
    </Button>
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button asChild className={cn(BTN_PRIMARY, "min-w-[118px]")}>
        <Link href={`/admin/jobs/${jobId}/edit`}>
          <Pencil className="size-4" /> Edit Job
        </Link>
      </Button>

      {/* Reopen is not gated (B7a precedent: it is reversible). Closing is. */}
      {isOpen ? (
        <ConfirmDialog
          trigger={closeButton}
          icon={CircleX}
          title="Are you sure?"
          confirmLabel="Close Job Posting"
          contentClassName="sm:max-w-[693px]"
          onConfirm={() =>
            toast.info("Closing a job from the admin portal isn't available yet.")
          }
          description={
            <>
              The job posting{" "}
              <span className="font-bold">&ldquo;{title}&rdquo;</span> by{" "}
              <span className="font-bold">{companyName}</span> will be closed
              for applications. It can be reopened any time.
            </>
          }
        />
      ) : (
        <Button
          type="button"
          className={BTN_CLOSE}
          onClick={() =>
            toast.info(
              "Reopening a job from the admin portal isn't available yet."
            )
          }
        >
          <RotateCcw className="size-4" /> Reopen
        </Button>
      )}

      <ConfirmDialog
        trigger={
          <Button type="button" className={BTN_DELETE}>
            <Trash2 className="size-4" /> Delete
          </Button>
        }
        icon={Trash2}
        title="Are you sure?"
        confirmLabel="Delete Job Posting"
        contentClassName="sm:max-w-[693px]"
        onConfirm={() => toast.info("Deleting a job isn't available yet.")}
        description={
          <>
            Deleting <span className="font-bold">&ldquo;{title}&rdquo;</span> by{" "}
            <span className="font-bold">{companyName}</span> also permanently
            deletes{" "}
            <span className="font-bold">
              {applicationCount}{" "}
              {applicationCount === 1 ? "application" : "applications"}
            </span>{" "}
            and every interview result and generated question attached to them.
            None of it can be recovered.
          </>
        }
      />
    </div>
  );
}
