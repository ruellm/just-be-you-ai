"use client";

import { useEffect, useState, useTransition } from "react";
import { Mic } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { finishInterview } from "../actions";

const TOTAL_QUESTIONS = 5;
const SAMPLE_TRANSCRIPT =
  "Thanks for joining today. I'd love to hear about your background and what motivates you in your work. Take your time and answer naturally — there are no wrong answers here.";

function isRedirect(error: unknown): boolean {
  return (
    !!error &&
    typeof error === "object" &&
    "digest" in error &&
    String((error as { digest?: string }).digest).startsWith("NEXT_REDIRECT")
  );
}

export function InterviewExperience({
  applicationId,
  jobTitle,
  companyName,
}: {
  applicationId: string;
  jobTitle: string;
  companyName: string;
}) {
  const [pending, startTransition] = useTransition();
  const [question, setQuestion] = useState(1);
  const [typed, setTyped] = useState("");

  // Auto-advancing question counter (visual flair only).
  useEffect(() => {
    const id = setInterval(() => {
      setQuestion((q) => Math.min(q + 1, TOTAL_QUESTIONS));
    }, 8000);
    return () => clearInterval(id);
  }, []);

  // "Live transcript" typing effect.
  useEffect(() => {
    const words = SAMPLE_TRANSCRIPT.split(" ");
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setTyped(words.slice(0, i).join(" "));
      if (i >= words.length) clearInterval(id);
    }, 160);
    return () => clearInterval(id);
  }, []);

  function finish() {
    startTransition(async () => {
      try {
        await finishInterview(applicationId);
      } catch (error) {
        if (isRedirect(error)) throw error;
        toast.error("Something went wrong finishing the interview.");
      }
    });
  }

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-xl flex-col items-center justify-center gap-8 px-6 text-center">
      <div className="space-y-1">
        <p className="text-muted-foreground text-sm">
          Question {question} of {TOTAL_QUESTIONS}
        </p>
        <h1 className="text-2xl font-semibold">AI interview in progress</h1>
        <p className="text-muted-foreground">Just be yourself — take your time.</p>
        <p className="text-muted-foreground text-sm">
          {jobTitle} · {companyName}
        </p>
      </div>

      {/* Pulsing mic */}
      <div className="relative flex size-32 items-center justify-center">
        <span className="bg-primary/20 absolute inline-flex size-full animate-ping rounded-full" />
        <span className="bg-primary/25 absolute inline-flex size-24 animate-pulse rounded-full" />
        <div className="bg-primary text-primary-foreground relative flex size-20 items-center justify-center rounded-full">
          <Mic className="size-8" />
        </div>
      </div>

      <div className="bg-muted/50 text-muted-foreground min-h-20 w-full rounded-lg border p-4 text-left text-sm">
        {typed}
        <span className="animate-pulse">▍</span>
      </div>

      <Button size="lg" onClick={finish} disabled={pending}>
        {pending ? "Finishing…" : "Finish Interview"}
      </Button>
    </div>
  );
}
