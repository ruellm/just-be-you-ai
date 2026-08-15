"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { StatusScreen } from "@/components/interview/InterviewUi";

// Shown on the result page while the interview has ended but the Claude grade
// hasn't been written yet (application.status === interview_completed and no
// InterviewResult row). It polls the server by calling router.refresh() every
// 2s; the server component re-runs and, once the graded row lands, renders the
// real result in place of this component. We NEVER redirect from here — that
// (plus the interview page's own guard) is what breaks the old bounce loop.
const POLL_MS = 2000;
const CAP_MS = 60_000;

export function ResultPending() {
  const router = useRouter();
  const [gaveUp, setGaveUp] = useState(false);

  useEffect(() => {
    const started = Date.now();
    const interval = setInterval(() => {
      if (Date.now() - started >= CAP_MS) {
        clearInterval(interval);
        setGaveUp(true);
        return;
      }
      router.refresh();
    }, POLL_MS);
    return () => clearInterval(interval);
  }, [router]);

  if (gaveUp) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center gap-4 px-6 text-center font-body">
        <h1 className="text-2xl font-semibold text-brand-primary">
          Taking longer than expected
        </h1>
        <p className="text-base text-brand-ink-secondary">
          Your results are still being finalized. Refresh to check again.
        </p>
        <Button
          onClick={() => router.refresh()}
          className="mt-2 h-10 rounded-[8px] bg-brand-secondary px-5 text-sm font-medium text-white hover:bg-brand-secondary/90"
        >
          Refresh
        </Button>
      </div>
    );
  }

  return (
    <StatusScreen
      title="Finalizing your interview results.."
      body="Please hold on while we process your responses and generate your performance summary. This will only take a few seconds."
    />
  );
}
