"use client";

import type { ReactNode } from "react";
import { XCircle } from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";

// Confirmation gate for every way OUT of a live interview (U4 #21) — the
// "Done answering? End Interview" button and the header's "Return to Home".
//
// Copy only: the dialog itself is the shared ConfirmDialog. `onConfirm` runs
// the caller's existing behaviour verbatim (room.disconnect() / endSession() /
// the navigation). Nothing about session, disconnect, or completion logic
// lives here.
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
          If you leave now, your session will{" "}
          <span className="font-bold">end immediately</span>. Restoring your
          seat credit can take between{" "}
          <span className="font-bold">3 days to 2 weeks</span>, depending on
          your membership tier.
        </>
      }
    />
  );
}
