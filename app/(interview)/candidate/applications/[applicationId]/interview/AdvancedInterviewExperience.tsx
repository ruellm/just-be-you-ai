"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Conversation, VoiceConversation } from "@elevenlabs/client";
import { Button } from "@/components/ui/button";
import {
  InterviewSetup,
  type InterviewMedia,
} from "@/components/interview/InterviewSetup";
import {
  LiveStage,
  StatusScreen,
  useElapsedSeconds,
} from "@/components/interview/InterviewUi";
import {
  applicationRecordingBackend,
  useInterviewRecorder,
} from "@/components/interview/useInterviewRecorder";
import { startAdvancedInterview } from "@/lib/elevenlabs/start-advanced-interview";
import { completeAdvancedInterview } from "@/lib/elevenlabs/complete-advanced-interview";

// Phase 3.3 — the ADVANCED (ElevenLabs) counterpart of InterviewExperience.tsx.
// Same page states (setup / connecting / live / ending / error) and the same
// exit (router.replace to the result page, whose "Finalizing…" pending state
// covers the grading wait), but the voice call runs on ElevenLabs
// Conversational AI in the browser instead of a LiveKit room + Python worker.
// On disconnect we stamp the application interview_completed + save the
// conversation id via completeAdvancedInterview; grading is a separate
// session (3.4).

type Phase = "setup" | "connecting" | "live" | "ending" | "error";

type TranscriptLine = {
  id: number;
  role: "user" | "agent";
  text: string;
};

export function AdvancedInterviewExperience({
  applicationId,
  candidateName,
  durationMinutes,
}: {
  applicationId: string;
  candidateName: string;
  durationMinutes: number;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("setup");
  const [mode, setMode] = useState<"speaking" | "listening">("listening");
  const [lines, setLines] = useState<TranscriptLine[]>([]);
  const [micMuted, setMicMuted] = useState(false);
  const [media, setMedia] = useState<InterviewMedia | null>(null);
  const [consentAt, setConsentAt] = useState<Date | null>(null);
  const mediaRef = useRef<InterviewMedia | null>(null);
  const started = useRef(false); // start runs exactly once
  const ended = useRef(false); // completion runs exactly once
  const conversationRef = useRef<VoiceConversation | null>(null);
  const conversationIdRef = useRef<string | null>(null);
  const nextLineId = useRef(0);

  const resultPath = `/candidate/applications/${applicationId}/result`;

  // Display-only elapsed counter: starts when the session goes live, freezes
  // when it leaves the live phase. Never influences the session or any end
  // condition.
  const elapsed = useElapsedSeconds(phase === "live");

  // Video recording of the candidate. Runs beside the voice connection and
  // never affects it; see useInterviewRecorder.
  const recordingBackend = useMemo(
    () => applicationRecordingBackend(applicationId),
    [applicationId]
  );
  const recorder = useInterviewRecorder({
    stream: media?.stream ?? null,
    active: phase === "live",
    consentAt,
    backend: recordingBackend,
  });

  // The camera + mic stream opened on the Setup page lives until this screen
  // unmounts, whatever way the interview ends.
  useEffect(
    () => () => {
      mediaRef.current?.stream.getTracks().forEach((track) => track.stop());
    },
    []
  );

  // The interview ends when the agent hangs up OR the candidate clicks
  // "End interview". Either way: stamp interview_completed + conversation id,
  // then straight to the result page — its "Finalizing…" state handles the
  // wait for grading.
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
    // Last chunk + pending uploads (capped at ~15s) behind the "Wrapping up"
    // screen before the result page loads.
    await recorder.stop("complete");
    router.replace(resultPath);
  }

  // Kick off the session once the candidate has agreed on the Setup page.
  // Permission was already granted there, so the SDK's own mic capture does
  // not prompt again.
  function handleStart(nextMedia: InterviewMedia) {
    if (started.current) return;
    started.current = true;
    mediaRef.current = nextMedia;
    setMedia(nextMedia);
    setConsentAt(new Date());
    setPhase("connecting");
    (async () => {
      try {
        const setup = await startAdvancedInterview(applicationId);
        if (!setup) {
          // Already interviewed — straight to the result page.
          router.replace(resultPath);
          return;
        }

        const conversation = await Conversation.startSession({
          agentId: setup.agentId,
          connectionType: "websocket",
          // The mic the candidate picked on the Setup page.
          inputDeviceId: nextMedia.micDeviceId ?? undefined,
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
        // A websocket voice session is always a VoiceConversation; the check
        // only narrows the SDK's union type.
        conversationRef.current =
          conversation instanceof VoiceConversation ? conversation : null;
      } catch (error) {
        console.error("Failed to start advanced interview:", error);
        setPhase("error");
      }
    })();
  }

  function handleCancel() {
    if (window.history.length > 1) router.back();
    else router.push("/candidate/applications");
  }

  function toggleMic() {
    const next = !micMuted;
    conversationRef.current?.setMicMuted(next);
    // The recording follows the mute so it holds what the interviewer heard.
    mediaRef.current?.stream.getAudioTracks().forEach((t) => (t.enabled = !next));
    setMicMuted(next);
  }

  if (phase === "setup") {
    return (
      <InterviewSetup
        durationMinutes={durationMinutes}
        onCancel={handleCancel}
        onStart={handleStart}
      />
    );
  }

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
      candidateName={candidateName}
      speaking={agentSpeaking}
      latestMessage={latestAgent?.text ?? null}
      elapsedSeconds={elapsed}
      cameraStream={media?.stream ?? null}
      micMuted={micMuted}
      onToggleMic={toggleMic}
      onEnd={() => void conversationRef.current?.endSession()}
      recording={recorder.recording}
    />
  );
}
