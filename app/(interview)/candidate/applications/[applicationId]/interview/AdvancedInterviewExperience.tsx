"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Conversation } from "@elevenlabs/client";
import { Button } from "@/components/ui/button";
import {
  LiveStage,
  StatusScreen,
  useElapsedSeconds,
} from "@/components/interview/InterviewUi";
import { startAdvancedInterview } from "@/lib/elevenlabs/start-advanced-interview";
import { completeAdvancedInterview } from "@/lib/elevenlabs/complete-advanced-interview";

// Phase 3.3 — the ADVANCED (ElevenLabs) counterpart of InterviewExperience.tsx.
// Same page states (connecting / live / ending / error) and the same exit
// (router.replace to the result page, whose "Finalizing…" pending state covers
// the grading wait), but the voice call runs on ElevenLabs Conversational AI
// in the browser instead of a LiveKit room + Python worker. On disconnect we
// stamp the application interview_completed + save the conversation id via
// completeAdvancedInterview; grading is a separate session (3.4).

type Phase = "connecting" | "live" | "ending" | "error";

type TranscriptLine = {
  id: number;
  role: "user" | "agent";
  text: string;
};

export function AdvancedInterviewExperience({
  applicationId,
  jobTitle,
}: {
  applicationId: string;
  jobTitle: string;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("connecting");
  const [mode, setMode] = useState<"speaking" | "listening">("listening");
  const [lines, setLines] = useState<TranscriptLine[]>([]);
  const started = useRef(false); // StrictMode-safe start guard (same as LiveKit path)
  const ended = useRef(false); // completion runs exactly once
  const conversationRef = useRef<Conversation | null>(null);
  const conversationIdRef = useRef<string | null>(null);
  const nextLineId = useRef(0);

  const resultPath = `/candidate/applications/${applicationId}/result`;

  // Display-only elapsed counter: starts when the session goes live, freezes
  // when it leaves the live phase. Never influences the session or any end
  // condition.
  const elapsed = useElapsedSeconds(phase === "live");

  // The interview ends when the agent hangs up OR the candidate clicks
  // "End interview". Either way: stamp interview_completed + conversation id,
  // then straight to the result page — its "Finalizing…" state handles the
  // wait for grading (which doesn't exist yet for the advanced path; expected).
  async function handleEnded() {
    if (ended.current) return;
    ended.current = true;
    setPhase("ending");
    try {
      await completeAdvancedInterview(applicationId, conversationIdRef.current);
    } catch (error) {
      // A stamp failure must not strand the candidate on a dead call screen.
      console.error("Failed to complete advanced interview:", error);
    }
    router.replace(resultPath);
  }

  // Kick off the session once on mount (StrictMode-safe via the ref guard).
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      try {
        const setup = await startAdvancedInterview(applicationId);
        if (!setup) {
          // Already interviewed — straight to the result page.
          router.replace(resultPath);
          return;
        }

        // Ask for the mic up front so a permission denial surfaces as our
        // error state instead of a mid-handshake failure.
        await navigator.mediaDevices.getUserMedia({ audio: true });

        const conversation = await Conversation.startSession({
          agentId: setup.agentId,
          connectionType: "websocket",
          // NOTE: the nesting is agent.prompt.prompt (a string inside a
          // `prompt` object). Flattening it makes ElevenLabs silently reject
          // the override (1008 "override not allowed").
          overrides: {
            agent: { prompt: { prompt: setup.systemPrompt } },
          },
          onConnect: ({ conversationId }) => {
            conversationIdRef.current = conversationId;
            setPhase("live");
          },
          onDisconnect: () => {
            void handleEnded();
          },
          onMessage: ({ message, role }) => {
            setLines((prev) =>
              [
                ...prev,
                { id: nextLineId.current++, role, text: message },
              ].slice(-50)
            );
          },
          onModeChange: ({ mode }) => setMode(mode),
          onError: (message, context) => {
            // Mid-call errors also fire onDisconnect, which handles the exit.
            console.error("[advanced-interview] ElevenLabs error:", message, context);
          },
        });
        conversationRef.current = conversation;
      } catch (error) {
        console.error("Failed to start advanced interview:", error);
        setPhase("error");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (phase === "connecting") {
    return (
      <StatusScreen
        title="Connecting you to our AI Interviewer.."
        body="Please hang tight while we prepare your workspace. Take a deep breath, you've got this!"
        footer={
          <p className="text-body text-brand-ink-secondary">
            <span className="font-bold text-brand-primary">
              Tip for a smooth interview:
            </span>{" "}
            Find a quiet space with a stable connection before you begin.
          </p>
        }
      />
    );
  }

  if (phase === "ending") {
    return (
      <StatusScreen
        title="Wrapping up.."
        body="Saving your interview. You'll be taken to your results in a moment."
      />
    );
  }

  if (phase === "error") {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-xl flex-col items-center justify-center gap-4 px-6 text-center font-body">
        <h1 className="text-heading font-semibold text-brand-primary">
          We couldn’t start your interview
        </h1>
        <p className="max-w-sm text-body text-brand-ink-secondary">
          Something went wrong connecting to the interview. Please check your
          microphone permissions and try again.
        </p>
        <div className="flex gap-3 pt-2">
          <Button
            onClick={() => window.location.reload()}
            className="h-10 rounded-[8px] bg-brand-secondary px-5 text-small font-medium text-white hover:bg-brand-secondary/90"
          >
            Try again
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push("/candidate/applications")}
            className="h-10 rounded-[8px] border-brand-border bg-brand-surface px-5 text-small font-medium text-brand-ink hover:bg-brand-container"
          >
            Back to applications
          </Button>
        </div>
      </div>
    );
  }

  const agentSpeaking = mode === "speaking";
  // Design shows only the interviewer's latest line (not a running transcript).
  const latestAgent = [...lines].reverse().find((l) => l.role === "agent");

  return (
    <LiveStage
      jobTitle={jobTitle}
      speaking={agentSpeaking}
      latestMessage={latestAgent?.text ?? null}
      onEnd={() => void conversationRef.current?.endSession()}
      elapsedSeconds={elapsed}
    />
  );
}
