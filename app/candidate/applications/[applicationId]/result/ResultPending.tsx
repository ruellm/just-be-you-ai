"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center justify-center px-6">
      <Card className="w-full">
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          {gaveUp ? (
            <>
              <h1 className="text-lg font-semibold">
                Taking longer than expected
              </h1>
              <p className="text-muted-foreground text-sm">
                Your results are still being finalized. Refresh to check again.
              </p>
              <Button onClick={() => router.refresh()}>Refresh</Button>
            </>
          ) : (
            <>
              <Loader2 className="text-primary size-8 animate-spin" />
              <h1 className="text-lg font-semibold">
                Finalizing your interview results…
              </h1>
              <p className="text-muted-foreground text-sm">
                This usually takes a few seconds. Your results will appear
                automatically.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
