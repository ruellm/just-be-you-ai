"use client";

import type { ReactNode } from "react";
import { XCircle } from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";

// Confirmation gate for every way OUT of a live interview (U4 #21) — the
// "End Interview" button and the header's "Return to Home".
//
// Copy only: the dialog itself is the shared ConfirmDialog. `onConfirm` runs
// the caller's existing behaviour verbatim (room.disconnect() / endSession() /
// the navigation). Nothing about session, disconnect, or completion logic
// lives here.
//
// Leaving ends the session and the interview is then graded on the answers
// given so far; it cannot be restarted. The copy says exactly that.
export function ConfirmExitInterview({
  trigger,
  onConfirm,
}: {
  trigger: ReactNode;
  onConfirm: () => void;
}) {
  return (
    <ConfirmDialog
      trigger={trigger}
      icon={XCircle}
      title="Exit Interview?"
      confirmLabel="Exit the Interview"
      onConfirm={onConfirm}
      description={
        <>
          If you leave now, this interview will{" "}
          <span className="font-bold">end immediately</span> and be scored on
          the answers you have given so far. You will not be able to restart
          it.
        </>
      }
    />
  );
}
