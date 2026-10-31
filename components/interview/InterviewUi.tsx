"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Loader2, Mic, MicOff, Settings, Video, VideoOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ConfirmExitInterview } from "./ConfirmExitInterview";
import { useMarkInterviewLive } from "./InterviewLiveContext";
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
        <h1 className="text-heading font-semibold text-brand-primary">{title}</h1>
        <p className="text-body text-brand-ink-secondary">{body}</p>
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

// ── Self-view tile ──────────────────────────────────────────────────────────
// Mirrored preview of the candidate's own camera. If the camera track ends
// mid-interview the tile shows a notice and the interview carries on.
function SelfViewTile({
  stream,
  label,
}: {
  stream: MediaStream | null;
  label: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraLost, setCameraLost] = useState(false);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
    const track = stream?.getVideoTracks()[0];
    if (!track) {
      setCameraLost(stream != null);
      return;
    }
    setCameraLost(track.readyState !== "live");
    const onEnded = () => setCameraLost(true);
    track.addEventListener("ended", onEnded);
    return () => track.removeEventListener("ended", onEnded);
  }, [stream]);

  return (
    <div className="relative aspect-[607/370] overflow-hidden rounded-[8px] bg-[#2e2836]">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="size-full -scale-x-100 object-cover"
      />
      {cameraLost ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#2e2836] px-6 text-center">
          <VideoOff className="size-8 text-white/60" />
          <p className="text-small text-white/80">
            Camera unavailable. Your interview continues.
          </p>
        </div>
      ) : null}
      <TileLabel>{label}</TileLabel>
    </div>
  );
}

function TileLabel({ children }: { children: ReactNode }) {
  return (
    <span className="absolute bottom-4 left-4 rounded-full bg-black/70 px-4 py-2 text-small font-medium tracking-[-0.5px] text-white">
      {children}
    </span>
  );
}

// Brand Kit Mic / Cam / Settings: 61px (mic, cam) and 51px (settings) circles
// on #3A3342, white icon; the muted mic turns Accent 2 with the mic-off icon.
const CONTROL_BTN =
  "flex items-center justify-center rounded-full bg-[#3a3342] text-white transition-colors hover:bg-[#4a4254] disabled:opacity-100";
const CONTROL_BTN_LG = cn(CONTROL_BTN, "size-[61px]");
const CONTROL_BTN_SM = cn(CONTROL_BTN, "size-[51px]");

// ── Live-stage layout ───────────────────────────────────────────────────────
export function LiveStage({
  candidateName,
  speaking,
  latestMessage,
  elapsedSeconds,
  cameraStream,
  micMuted,
  onToggleMic,
  onEnd,
  endDisabled,
  recording,
}: {
  candidateName: string;
  speaking: boolean;
  latestMessage: string | null;
  elapsedSeconds: number;
  cameraStream: MediaStream | null;
  micMuted: boolean;
  onToggleMic: () => void;
  onEnd: () => void;
  endDisabled?: boolean;
  // Shows the Recording badge. Display only.
  recording: boolean;
}) {
  useMarkInterviewLive();

  return (
    <div className="flex min-h-[calc(100vh-5rem)] flex-col bg-[#1e1e1e] font-body text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pt-6 pb-10">
        <div className="flex min-h-[38px] justify-end">
          {recording ? (
            <div className="flex items-center gap-2 rounded-full bg-black px-4 py-2 text-small font-medium tracking-[-0.5px]">
              <span className="relative flex size-5 items-center justify-center">
                <span className="absolute size-5 rounded-full bg-accent-2/30" />
                <span className="size-2.5 rounded-full bg-accent-2" />
              </span>
              Recording
              <span aria-hidden className="size-1.5 rounded-full bg-white/60" />
              <span>{formatElapsed(elapsedSeconds)}</span>
            </div>
          ) : null}
        </div>

        <div className="mt-8 space-y-2 text-center">
          <h1 className="text-heading font-bold">AI Interview In Progress</h1>
          <p className="mx-auto max-w-3xl text-body text-[#b8b0c4]">
            Speak clearly into your microphone and converse with the interviewer.
            Please remain on this screen until the session is complete. Your
            responses are being recorded.
          </p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div
            className={cn(
              "relative flex aspect-[607/370] items-center justify-center overflow-hidden rounded-[8px] border-[3px] bg-[#2b1b3d] transition-colors",
              speaking ? "border-brand-secondary" : "border-brand-secondary/40"
            )}
          >
            <VoiceOrb speaking={speaking} />
            <TileLabel>AI Interviewer</TileLabel>
          </div>
          <SelfViewTile stream={cameraStream} label={`${candidateName} (You)`} />
        </div>

        <div className="mt-5 min-h-[80px] rounded-[8px] bg-[#0d0d0d] px-6 py-4">
          <p className="text-body tracking-[-0.1px] text-accent-4">AI Interviewer</p>
          <p className="mt-1 text-small text-white">{latestMessage ?? ""}</p>
        </div>
      </div>

      <div className="sticky bottom-0 border-t border-white/5 bg-[#141414]">
        <div className="mx-auto grid max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-6 py-5">
          <div />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onToggleMic}
              aria-pressed={micMuted}
              aria-label={micMuted ? "Unmute microphone" : "Mute microphone"}
              className={cn(
                CONTROL_BTN_LG,
                micMuted && "bg-accent-2 hover:bg-accent-2/90"
              )}
            >
              {micMuted ? <MicOff className="size-7" /> : <Mic className="size-7" />}
            </button>
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  tabIndex={0}
                  aria-label="Camera on"
                  className={cn(CONTROL_BTN_LG, "cursor-default")}
                >
                  <Video className="size-7" />
                </span>
              </TooltipTrigger>
              <TooltipContent>Your camera stays on during the interview.</TooltipContent>
            </Tooltip>
            <button
              type="button"
              aria-label="Settings"
              onClick={() => toast("Settings are not available yet.")}
              className={CONTROL_BTN_SM}
            >
              <Settings className="size-6" />
            </button>
          </div>
          <div className="flex justify-end">
            {/* Gated behind the exit confirmation. `onEnd` is unchanged: it
                still runs room.disconnect() / endSession() verbatim. */}
            <ConfirmExitInterview
              onConfirm={onEnd}
              trigger={
                <Button
                  type="button"
                  disabled={endDisabled}
                  className="h-10 rounded-[8px] bg-accent-2 px-6 text-body font-semibold tracking-[-0.5px] text-white hover:bg-accent-2/90"
                >
                  End Interview
                </Button>
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
