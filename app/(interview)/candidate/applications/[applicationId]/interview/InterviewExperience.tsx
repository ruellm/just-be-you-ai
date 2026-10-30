"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import {
  startInterviewSession,
  type InterviewConnection,
} from "@/lib/livekit/start-interview";

type Phase = "setup" | "connecting" | "live" | "ending" | "error";

export function InterviewExperience({
  applicationId,
  candidateName,
  durationMinutes,
}: {
  applicationId: string;
  candidateName: string;
  durationMinutes: number;
}) {
  const router = useRouter();
  const [conn, setConn] = useState<InterviewConnection | null>(null);
  const [phase, setPhase] = useState<Phase>("setup");
  const [media, setMedia] = useState<InterviewMedia | null>(null);
  const [consentAt, setConsentAt] = useState<Date | null>(null);
  const mediaRef = useRef<InterviewMedia | null>(null);
  const started = useRef(false);

  const resultPath = `/candidate/applications/${applicationId}/result`;

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

  // Kick off the session once the candidate has agreed on the Setup page.
  function handleStart(nextMedia: InterviewMedia) {
    if (started.current) return;
    started.current = true;
    mediaRef.current = nextMedia;
    setMedia(nextMedia);
    setConsentAt(new Date());
    setPhase("connecting");
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
  }

  function handleCancel() {
    if (window.history.length > 1) router.back();
    else router.push("/candidate/applications");
  }

  // The interview ends when the agent disconnects OR the candidate clicks
  // "End interview". Either way we land here and go straight to the result page
  // — no delay. The result page's "Finalizing…" pending state handles the wait
  // for the (slow) Python grading write, so we don't race a fixed timer against
  // it (that race caused the /interview ⇄ /result bounce loop).
  // The recorder flush (last chunk + pending uploads, capped at ~15s) happens
  // behind the "Wrapping up" screen before the result page loads.
  async function handleDisconnected() {
    console.log(
      `[interview] room disconnected for application ${applicationId}; navigating to result.`
    );
    setPhase((p) => (p === "ending" ? p : "ending"));
    await recorder.stop("complete");
    router.replace(resultPath);
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

  if (phase === "error" || !conn) {
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

  return (
    <LiveKitRoom
      token={conn.token}
      serverUrl={conn.url}
      connect
      // The mic the candidate picked on the Setup page is the one published.
      audio={media?.micDeviceId ? { deviceId: media.micDeviceId } : true}
      video={false}
      onDisconnected={handleDisconnected}
      className="!bg-transparent"
    >
      <RoomAudioRenderer />
      <InterviewStage
        candidateName={candidateName}
        cameraStream={media?.stream ?? null}
        recording={recorder.recording}
      />
    </LiveKitRoom>
  );
}

// Rendered INSIDE <LiveKitRoom>, so the LiveKit hooks have their context.
function InterviewStage({
  candidateName,
  cameraStream,
  recording,
}: {
  candidateName: string;
  cameraStream: MediaStream | null;
  recording: boolean;
}) {
  const room = useRoomContext();
  const { state } = useVoiceAssistant();
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();
  const transcriptions = useTranscriptions();

  const agentSpeaking = state === "speaking";

  // Display-only elapsed counter: runs while this stage is mounted (i.e. the
  // room is live) and stops when it unmounts on disconnect. It does not feed
  // into any end condition or the interviewMaxMinutes cap.
  const elapsed = useElapsedSeconds(true);

  // The interviewer's most recent line (design shows only the latest agent
  // message, not a running transcript). Empty if the agent isn't forwarding
  // transcriptions.
  const latestAgent = [...transcriptions]
    .reverse()
    .find((seg) => seg.participantInfo.identity !== localParticipant?.identity);

  return (
    <LiveStage
      candidateName={candidateName}
      speaking={agentSpeaking}
      latestMessage={latestAgent?.text ?? null}
      elapsedSeconds={elapsed}
      cameraStream={cameraStream}
      micMuted={!isMicrophoneEnabled}
      onToggleMic={() => {
        const enable = !isMicrophoneEnabled;
        void localParticipant.setMicrophoneEnabled(enable);
        // The recording follows the mute so it holds what the interviewer heard.
        cameraStream?.getAudioTracks().forEach((t) => (t.enabled = enable));
      }}
      onEnd={() => room.disconnect()}
      recording={recording}
    />
  );
}
