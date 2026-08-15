"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Shared, presentation-only pieces for the interview flow. Both tiers
// (LiveKit + ElevenLabs) render exactly these so they stay visually identical.
// Nothing in here touches session/connection state.

// ── Big spinner (Connecting / Finalizing) ────────────────────────────────────
export function BigSpinner({ className }: { className?: string }) {
  return (
    <Loader2
      aria-hidden
      strokeWidth={1.5}
      className={cn("size-[150px] animate-spin text-brand-secondary", className)}
    />
  );
}

// Centred vertical stack used by Connecting / Finalizing / Wrapping up.
export function StatusScreen({
  title,
  body,
  footer,
  children,
}: {
  title: string;
  body: string;
  footer?: ReactNode;
  children?: ReactNode; // optional slot under the body (e.g. buttons)
}) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-2xl flex-col items-center justify-center gap-6 px-6 py-12 text-center font-body">
      <BigSpinner />
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-brand-primary">{title}</h1>
        <p className="text-base text-brand-ink-secondary">{body}</p>
      </div>
      {children}
      {footer ? <div className="pt-10">{footer}</div> : null}
    </div>
  );
}

// ── Voice visualizer: concentric rings pulsing with the agent's speech ──────
// A solid brand-secondary core + 3 progressively larger / more transparent
// rings (50% / 30% / 19% opacity outward). `speaking` scales + pulses them.
export function VoiceOrb({ speaking }: { speaking: boolean }) {
  return (
    <div
      aria-hidden
      className="relative flex size-[280px] shrink-0 items-center justify-center"
    >
      {[
        { size: 280, opacity: "bg-brand-secondary/[0.19]", delay: "300ms" },
        { size: 220, opacity: "bg-brand-secondary/30", delay: "150ms" },
        { size: 160, opacity: "bg-brand-secondary/50", delay: "0ms" },
      ].map((ring) => (
        <span
          key={ring.size}
          style={{
            width: ring.size,
            height: ring.size,
            animationDelay: ring.delay,
          }}
          className={cn(
            "absolute rounded-full transition-transform duration-500",
            ring.opacity,
            speaking ? "animate-pulse scale-100" : "scale-90"
          )}
        />
      ))}
      <span
        className={cn(
          "relative size-[100px] rounded-full bg-brand-secondary transition-transform duration-300",
          speaking ? "scale-110" : "scale-100"
        )}
      />
    </div>
  );
}

// ── Elapsed-time counter (DISPLAY ONLY) ─────────────────────────────────────
// Starts counting when `active` flips true and freezes when it flips false.
// It has no effect on the session, the interviewMaxMinutes cap, or any end
// condition — purely a label.
export function useElapsedSeconds(active: boolean): number {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!active) return;
    const started = Date.now();
    const id = setInterval(
      () => setSeconds(Math.floor((Date.now() - started) / 1000)),
      1000
    );
    return () => clearInterval(id);
  }, [active]);
  return seconds;
}

export function formatElapsed(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ── Live-stage layout ───────────────────────────────────────────────────────
export function LiveStage({
  jobTitle,
  companyName,
  speaking,
  latestMessage,
  onEnd,
  endDisabled,
  elapsedSeconds,
}: {
  jobTitle: string;
  companyName: string;
  speaking: boolean;
  latestMessage: string | null;
  onEnd: () => void;
  endDisabled?: boolean;
  elapsedSeconds: number;
}) {
  return (
    <div className="mx-auto flex max-w-5xl flex-col items-center gap-10 px-6 py-12 text-center font-body">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-brand-primary">
          AI Interview In Progress
        </h1>
        <p className="text-base text-brand-ink-secondary">
          Application for <span className="font-bold">{jobTitle}</span> from{" "}
          <span className="font-bold">{companyName}</span>.
        </p>
      </div>

      <div className="flex w-full flex-col items-center gap-10 lg:flex-row lg:items-center lg:justify-center lg:gap-16">
        <VoiceOrb speaking={speaking} />

        <div className="flex w-full max-w-[420px] flex-col gap-4">
          <div className="flex min-h-[126px] items-center rounded-[12px] border border-brand-border bg-brand-surface px-6 py-5 text-left text-base text-brand-ink-secondary">
            {latestMessage ?? "The interviewer will begin shortly…"}
          </div>
          <div className="flex h-[47px] items-center justify-center gap-2 rounded-[12px] border border-brand-border bg-brand-surface text-base text-brand-ink-secondary">
            <span aria-hidden className="size-2.5 rounded-full bg-accent-2" />
            Recording in Progress
          </div>
          <Button
            type="button"
            onClick={onEnd}
            disabled={endDisabled}
            className="h-10 w-full rounded-[8px] bg-accent-2 text-base font-normal text-white hover:bg-accent-2/90"
          >
            Done answering? End Interview
          </Button>
        </div>
      </div>

      <div className="flex flex-col items-center gap-6">
        <p className="max-w-3xl text-base text-brand-ink-secondary">
          Speak clearly into your microphone and converse with the interviewer.
          Please remain on this screen until the session is complete. Your
          responses are being recorded.
        </p>
        <div className="flex h-[47px] w-[240px] items-center justify-center gap-2 rounded-[12px] border border-brand-border bg-brand-surface text-sm font-bold text-brand-ink-secondary">
          <Clock className="size-4" />
          Time Elapsed: {formatElapsed(elapsedSeconds)}
        </div>
      </div>
    </div>
  );
}
