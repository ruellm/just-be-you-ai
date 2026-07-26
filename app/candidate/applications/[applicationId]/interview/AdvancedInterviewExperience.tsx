"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Conversation } from "@elevenlabs/client";
import { Loader2, PhoneOff } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  companyName,
}: {
  applicationId: string;
  jobTitle: string;
  companyName: string;
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
      <Centered>
        <Loader2 className="text-primary size-10 animate-spin" />
        <p className="text-muted-foreground">Connecting to your interview…</p>
      </Centered>
    );
  }

  if (phase === "ending") {
    return (
      <Centered>
        <Loader2 className="text-primary size-10 animate-spin" />
        <h1 className="text-xl font-semibold">Wrapping up…</h1>
        <p className="text-muted-foreground">Saving your interview.</p>
      </Centered>
    );
  }

  if (phase === "error") {
    return (
      <Centered>
        <h1 className="text-xl font-semibold">We couldn’t start your interview</h1>
        <p className="text-muted-foreground max-w-sm">
          Something went wrong connecting to the interview. Please check your
          microphone permissions and try again.
        </p>
        <div className="flex gap-3">
          <Button onClick={() => window.location.reload()}>Try again</Button>
          <Button
            variant="outline"
            onClick={() => router.push("/candidate/applications")}
          >
            Back to applications
          </Button>
        </div>
      </Centered>
    );
  }

  const agentSpeaking = mode === "speaking";
  const recent = lines.slice(-6);

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-xl flex-col items-center justify-center gap-8 px-6 text-center">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">AI interview in progress</h1>
        <p className="text-muted-foreground text-sm">
          {jobTitle} · {companyName}
        </p>
      </div>

      {/* Simple speaking indicator — a pulsing dot instead of the LiveKit bars. */}
      <div className="flex h-32 w-full items-center justify-center">
        <div
          className={
            agentSpeaking
              ? "bg-primary size-16 animate-pulse rounded-full"
              : "bg-muted-foreground/30 size-16 rounded-full"
          }
        />
      </div>

      <p
        className={
          agentSpeaking
            ? "text-primary text-sm font-medium"
            : "text-muted-foreground text-sm"
        }
      >
        {agentSpeaking ? "Interviewer is speaking…" : "Listening — go ahead."}
      </p>

      {/* Live transcript — populated from onMessage. */}
      {recent.length > 0 && (
        <div className="bg-muted/50 max-h-40 w-full space-y-2 overflow-y-auto rounded-lg border p-4 text-left text-sm">
          {recent.map((line) => (
            <p key={line.id}>
              <span className="text-muted-foreground font-medium">
                {line.role === "user" ? "You: " : "Interviewer: "}
              </span>
              {line.text}
            </p>
          ))}
        </div>
      )}

      <p className="text-muted-foreground max-w-sm text-sm">
        Speak naturally. The interview will end on its own when finished.
      </p>

      <Button
        variant="outline"
        size="sm"
        onClick={() => void conversationRef.current?.endSession()}
        className="gap-2"
      >
        <PhoneOff className="size-4" />
        End interview
      </Button>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[80vh] max-w-xl flex-col items-center justify-center gap-4 px-6 text-center">
      {children}
    </div>
  );
}
