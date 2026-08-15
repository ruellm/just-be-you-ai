"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import "@livekit/components-styles";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useLocalParticipant,
  useRoomContext,
  useTranscriptions,
  useVoiceAssistant,
} from "@livekit/components-react";
import { Button } from "@/components/ui/button";
import {
  LiveStage,
  StatusScreen,
  useElapsedSeconds,
} from "@/components/interview/InterviewUi";
import {
  startInterviewSession,
  type InterviewConnection,
} from "@/lib/livekit/start-interview";

type Phase = "connecting" | "live" | "ending" | "error";

export function InterviewExperience({
  applicationId,
  jobTitle,
  companyName,
}: {
  applicationId: string;
  jobTitle: string;
  companyName: string;
}) {
  const router = useRouter();
  const [conn, setConn] = useState<InterviewConnection | null>(null);
  const [phase, setPhase] = useState<Phase>("connecting");
  const started = useRef(false);

  const resultPath = `/candidate/applications/${applicationId}/result`;

  // Kick off the session once on mount (StrictMode-safe via the ref guard).
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      try {
        const result = await startInterviewSession(applicationId);
        if (!result) {
          // Already interviewed — straight to the result page.
          router.replace(resultPath);
          return;
        }
        setConn(result);
        setPhase("live");
      } catch (error) {
        console.error("Failed to start interview session:", error);
        setPhase("error");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The interview ends when the agent disconnects OR the candidate clicks
  // "End interview". Either way we land here and go straight to the result page
  // — no delay. The result page's "Finalizing…" pending state handles the wait
  // for the (slow) Python grading write, so we don't race a fixed timer against
  // it (that race caused the /interview ⇄ /result bounce loop).
  function handleDisconnected() {
    console.log(
      `[interview] room disconnected for application ${applicationId}; navigating to result.`
    );
    setPhase((p) => (p === "ending" ? p : "ending"));
    router.replace(resultPath);
  }

  if (phase === "connecting") {
    return (
      <StatusScreen
        title="Connecting you to our AI Interviewer.."
        body="Please hang tight while we prepare your workspace. Take a deep breath, you've got this!"
        footer={
          <p className="text-base text-brand-ink-secondary">
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

  if (phase === "error" || !conn) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-xl flex-col items-center justify-center gap-4 px-6 text-center font-body">
        <h1 className="text-2xl font-semibold text-brand-primary">
          We couldn’t start your interview
        </h1>
        <p className="max-w-sm text-base text-brand-ink-secondary">
          Something went wrong connecting to the interview. Please check your
          microphone permissions and try again.
        </p>
        <div className="flex gap-3 pt-2">
          <Button
            onClick={() => window.location.reload()}
            className="h-10 rounded-[8px] bg-brand-secondary px-5 text-sm font-medium text-white hover:bg-brand-secondary/90"
          >
            Try again
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push("/candidate/applications")}
            className="h-10 rounded-[8px] border-brand-border bg-brand-surface px-5 text-sm font-medium text-brand-ink hover:bg-brand-container"
          >
            Back to applications
          </Button>
        </div>
      </div>
    );
  }

  return (
    <LiveKitRoom
      token={conn.token}
      serverUrl={conn.url}
      connect
      audio
      video={false}
      onDisconnected={handleDisconnected}
      className="!bg-transparent"
    >
      <RoomAudioRenderer />
      <InterviewStage jobTitle={jobTitle} companyName={companyName} />
    </LiveKitRoom>
  );
}

// Rendered INSIDE <LiveKitRoom>, so the LiveKit hooks have their context.
function InterviewStage({
  jobTitle,
  companyName,
}: {
  jobTitle: string;
  companyName: string;
}) {
  const room = useRoomContext();
  const { state } = useVoiceAssistant();
  const { localParticipant } = useLocalParticipant();
  const transcriptions = useTranscriptions();

  const agentSpeaking = state === "speaking";

  // Display-only elapsed counter: runs while this stage is mounted (i.e. the
  // room is live) and stops when it unmounts on disconnect. It does not feed
  // into any end condition or the interviewMaxMinutes cap.
  const elapsed = useElapsedSeconds(true);

  // The interviewer's most recent line (design shows only the latest agent
  // message, not a running transcript). Empty if the agent isn't forwarding
  // transcriptions — the card then shows its placeholder.
  const latestAgent = [...transcriptions]
    .reverse()
    .find((seg) => seg.participantInfo.identity !== localParticipant?.identity);

  return (
    <LiveStage
      jobTitle={jobTitle}
      companyName={companyName}
      speaking={agentSpeaking}
      latestMessage={latestAgent?.text ?? null}
      onEnd={() => room.disconnect()}
      elapsedSeconds={elapsed}
    />
  );
}
