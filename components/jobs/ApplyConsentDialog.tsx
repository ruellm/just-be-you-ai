"use client";

import type { ReactNode } from "react";
import { Info } from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";

// Recording consent gate shown before any Apply Now runs. A ConfirmDialog
// preset so every entry point shares the same copy. Cancel does nothing;
// `onAgree` runs the caller's existing apply flow.
export function ApplyConsentDialog({
  trigger,
  onAgree,
}: {
  trigger: ReactNode;
  onAgree: () => void;
}) {
  return (
    <ConfirmDialog
      tone="info"
      trigger={trigger}
      icon={Info}
      title="Ready to begin?"
      description={
        <>
          Before we jump in, please note that this AI interview will be{" "}
          <span className="font-semibold">recorded</span> (audio, video, and
          transcript){" "}
          <span className="font-semibold">for evaluation purposes.</span>
        </>
      }
      confirmLabel="Agree & Start Interview"
      onConfirm={onAgree}
    />
  );
}
