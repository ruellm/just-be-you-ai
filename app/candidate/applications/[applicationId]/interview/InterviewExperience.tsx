"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import "@livekit/components-styles";
import {
  BarVisualizer,
  LiveKitRoom,
  RoomAudioRenderer,
  useLocalParticipant,
  useRoomContext,
  useTranscriptions,
  useVoiceAssistant,
} from "@livekit/components-react";
import { Loader2, PhoneOff } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  // "End interview". Either way we land here. Brief pause so the save_result
  // server-side write (Python) has a beat, then go to the result page.
  function handleDisconnected() {
    setPhase((p) => (p === "ending" ? p : "ending"));
    setTimeout(() => router.replace(resultPath), 1500);
  }

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

  if (phase === "error" || !conn) {
    return (
      <Centered>
        <h1 className="text-xl font-semibold">We couldn’t start your interview</h1>
        <p className="text-muted-foreground max-w-sm">
          Something went wrong connecting to the interview. Please check your
          microphone permissions and try again.
        </p>
        <div className="flex gap-3">
          <Button onClick={() => window.location.reload()}>Try again</Button>
          <Button variant="outline" onClick={() => router.push("/candidate/applications")}>
            Back to applications
          </Button>
        </div>
      </Centered>
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

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[80vh] max-w-xl flex-col items-center justify-center gap-4 px-6 text-center">
      {children}
    </div>
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
  const { state, audioTrack } = useVoiceAssistant();
  const { localParticipant } = useLocalParticipant();
  const transcriptions = useTranscriptions();

  const candidateSpeaking = localParticipant?.isSpeaking ?? false;
  const agentSpeaking = state === "speaking";

  let statusLine = "Connecting…";
  if (state === "listening") statusLine = "Listening — go ahead.";
  else if (state === "thinking") statusLine = "Thinking…";
  else if (agentSpeaking) statusLine = "Interviewer is speaking…";
  else if (candidateSpeaking) statusLine = "Listening — go ahead.";

  // Latest few transcript segments (newest last). May be empty if the agent
  // isn't forwarding transcriptions — that's fine, the area just stays quiet.
  const recent = transcriptions.slice(-6);

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-xl flex-col items-center justify-center gap-8 px-6 text-center">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">AI interview in progress</h1>
        <p className="text-muted-foreground text-sm">
          {jobTitle} · {companyName}
        </p>
      </div>

      {/* Agent audio visualizer — bars react to the interviewer's voice. */}
      <div
        className="flex h-32 w-full items-center justify-center"
        data-lk-theme="default"
      >
        <BarVisualizer
          state={state}
          trackRef={audioTrack}
          barCount={7}
          options={{ minHeight: 8 }}
          className="h-24 w-48"
        />
      </div>

      <p
        className={
          agentSpeaking
            ? "text-primary text-sm font-medium"
            : candidateSpeaking
              ? "text-sm font-medium text-green-600 dark:text-green-400"
              : "text-muted-foreground text-sm"
        }
      >
        {statusLine}
      </p>

      {/* Optional live transcript — quietly populated if available. */}
      {recent.length > 0 && (
        <div className="bg-muted/50 max-h-40 w-full space-y-2 overflow-y-auto rounded-lg border p-4 text-left text-sm">
          {recent.map((seg) => (
            <p key={seg.streamInfo.id}>
              <span className="text-muted-foreground font-medium">
                {seg.participantInfo.identity === localParticipant?.identity
                  ? "You: "
                  : "Interviewer: "}
              </span>
              {seg.text}
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
        onClick={() => room.disconnect()}
        className="gap-2"
      >
        <PhoneOff className="size-4" />
        End interview
      </Button>
    </div>
  );
}
