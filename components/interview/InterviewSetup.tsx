"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, CircleCheck, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// Pre-interview setup: camera preview, device pickers, a mic level meter, the
// checklist and the recording consent. Both camera and microphone must be live
// before the candidate can continue. The stream it opens is handed to the
// caller on start and stays alive into the interview, so the browser asks for
// permission once. Nothing here knows about jobs or applications.

export type InterviewMedia = {
  // Camera video track + microphone audio track.
  stream: MediaStream;
  micDeviceId: string | null;
  cameraDeviceId: string | null;
};

const CHECKLIST = [
  "Turn on your camera and allow microphone access.",
  "Find a quiet spot where you won't be interrupted.",
  "Use a stable internet connection.",
  "Ensure your face is visible and centered in the frame.",
  "No notes, AI tools, or other devices allowed.",
  "Stay on this screen until the interview is done.",
];

const CONSENT_TEXT =
  "By continuing, you consent to this interview being recorded (audio, video, and transcript). We will collect and process your data in line with data privacy laws for evaluation purposes only.";

const METER_BARS = 10;

type MediaProblem = "denied" | "missing" | "busy" | "other";

const PROBLEM_TEXT: Record<MediaProblem, string> = {
  denied:
    "Camera and microphone access is blocked. Click the camera or lock icon in your browser's address bar, allow both, then try again.",
  missing:
    "No camera or microphone was found. Connect one, then try again.",
  busy:
    "Your camera or microphone is being used by another app. Close it, then try again.",
  other:
    "We couldn't access your camera and microphone. Check your browser's site permissions, then try again.",
};

function classifyMediaError(error: unknown): MediaProblem {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") return "denied";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "missing";
  if (name === "NotReadableError" || name === "AbortError") return "busy";
  return "other";
}

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

function deviceLabel(device: MediaDeviceInfo, index: number, kind: string) {
  return device.label || `${kind} ${index + 1}`;
}

export function InterviewSetup({
  durationMinutes,
  onCancel,
  onStart,
}: {
  durationMinutes: number;
  onCancel: () => void;
  onStart: (media: InterviewMedia) => void;
}) {
  const [mics, setMics] = useState<MediaDeviceInfo[]>([]);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  // "" means the browser's default device.
  const [micId, setMicId] = useState("");
  const [cameraId, setCameraId] = useState("");
  const [activeMicId, setActiveMicId] = useState("");
  const [activeCameraId, setActiveCameraId] = useState("");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [problem, setProblem] = useState<MediaProblem | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [level, setLevel] = useState(0);
  const streamRef = useRef<MediaStream | null>(null);
  const handedOff = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Open the camera and mic on mount, and again whenever a device is picked.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const next = await navigator.mediaDevices.getUserMedia({
          audio: micId ? { deviceId: { exact: micId } } : true,
          video: {
            ...(cameraId ? { deviceId: { exact: cameraId } } : {}),
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
        });
        if (cancelled) {
          stopStream(next);
          return;
        }
        stopStream(streamRef.current);
        streamRef.current = next;
        setStream(next);
        setProblem(null);
        setActiveMicId(next.getAudioTracks()[0]?.getSettings().deviceId ?? "");
        setActiveCameraId(next.getVideoTracks()[0]?.getSettings().deviceId ?? "");

        // Device labels are only available once permission has been granted.
        const devices = await navigator.mediaDevices.enumerateDevices();
        if (cancelled) return;
        setMics(devices.filter((d) => d.kind === "audioinput" && d.deviceId));
        setCameras(devices.filter((d) => d.kind === "videoinput" && d.deviceId));
      } catch (error) {
        if (cancelled) return;
        console.error("[interview-setup] Could not open camera/mic:", error);
        stopStream(streamRef.current);
        streamRef.current = null;
        setStream(null);
        setProblem(classifyMediaError(error));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [micId, cameraId, attempt]);

  // Release the devices if the candidate leaves without starting.
  useEffect(
    () => () => {
      if (!handedOff.current) stopStream(streamRef.current);
    },
    []
  );

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);

  // Mic level meter: RMS of the selected mic, mapped onto the bars.
  useEffect(() => {
    const track = stream?.getAudioTracks()[0];
    if (!track) {
      setLevel(0);
      return;
    }
    const context = new AudioContext();
    const source = context.createMediaStreamSource(new MediaStream([track]));
    const analyser = context.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    void context.resume();
    const samples = new Uint8Array(analyser.fftSize);
    let frame = 0;
    const tick = () => {
      analyser.getByteTimeDomainData(samples);
      let sum = 0;
      for (const sample of samples) {
        const v = (sample - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / samples.length);
      setLevel(Math.min(METER_BARS, Math.round(Math.min(1, rms * 4) * METER_BARS)));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      source.disconnect();
      void context.close();
    };
  }, [stream]);

  const ready =
    stream != null &&
    problem == null &&
    stream.getVideoTracks().some((t) => t.readyState === "live") &&
    stream.getAudioTracks().some((t) => t.readyState === "live");

  function start() {
    if (!stream || !ready) return;
    handedOff.current = true;
    onStart({
      stream,
      micDeviceId: activeMicId || null,
      cameraDeviceId: activeCameraId || null,
    });
  }

  function cancel() {
    stopStream(streamRef.current);
    streamRef.current = null;
    onCancel();
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-12 font-body lg:py-16">
      <div className="space-y-2 text-center">
        <h1 className="text-heading font-semibold tracking-[-0.5px] text-brand-primary">
          Ready to begin your interview?
        </h1>
        <p className="text-body tracking-[-0.1px] text-brand-ink-secondary">
          Make sure to find a quiet spot. This takes about {durationMinutes}{" "}
          minutes.
        </p>
      </div>

      <div className="mt-8 rounded-[12px] border border-brand-border bg-brand-surface p-6 sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,480px)_minmax(0,1fr)]">
          <div className="space-y-4">
            <div className="relative aspect-[480/285] overflow-hidden rounded-[8px] bg-brand-card">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="size-full -scale-x-100 object-cover"
              />
              {!stream ? (
                <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-small text-white/70">
                  {problem ? "Camera unavailable" : "Starting your camera…"}
                </div>
              ) : null}
              <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2">
                <span className="flex size-10 items-center justify-center rounded-full bg-black/40 text-white">
                  <Mic className="size-5" />
                </span>
                <span className="flex size-10 items-center justify-center rounded-full bg-black/40 text-white">
                  <Camera className="size-5" />
                </span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Select value={micId || activeMicId} onValueChange={setMicId}>
                <SelectTrigger
                  aria-label="Microphone"
                  className="h-10 w-full rounded-[8px] border-brand-border bg-brand-surface font-body text-meta text-brand-ink"
                >
                  <SelectValue placeholder="Default Microphone" />
                </SelectTrigger>
                <SelectContent>
                  {mics.map((d, i) => (
                    <SelectItem key={d.deviceId} value={d.deviceId}>
                      {deviceLabel(d, i, "Microphone")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={cameraId || activeCameraId} onValueChange={setCameraId}>
                <SelectTrigger
                  aria-label="Camera"
                  className="h-10 w-full rounded-[8px] border-brand-border bg-brand-surface font-body text-meta text-brand-ink"
                >
                  <SelectValue placeholder="Default Camera" />
                </SelectTrigger>
                <SelectContent>
                  {cameras.map((d, i) => (
                    <SelectItem key={d.deviceId} value={d.deviceId}>
                      {deviceLabel(d, i, "Camera")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <p className="text-body font-medium tracking-[-0.5px] text-brand-ink">
                Microphone Check
              </p>
              <div className="flex gap-1.5" aria-hidden>
                {Array.from({ length: METER_BARS }, (_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-2.5 flex-1 rounded-[3px] transition-colors",
                      i < level ? "bg-brand-secondary" : "bg-brand-border/60"
                    )}
                  />
                ))}
              </div>
              <p className="text-small font-medium tracking-[-0.5px] text-brand-ink-secondary">
                Say something. The bars should move.
              </p>
            </div>

            {problem ? (
              <div className="rounded-[8px] border border-accent-2 bg-status-fail px-4 py-3 text-small text-accent-2">
                <p>{PROBLEM_TEXT[problem]}</p>
                <button
                  type="button"
                  onClick={() => setAttempt((n) => n + 1)}
                  className="mt-1 font-semibold underline"
                >
                  Try again
                </button>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-6">
            <div className="space-y-4">
              <h2 className="text-heading font-semibold tracking-[-0.5px] text-brand-primary">
                Before you start, make sure to..
              </h2>
              <ul className="space-y-3">
                {CHECKLIST.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <CircleCheck
                      className="mt-0.5 size-6 shrink-0 fill-brand-secondary text-white"
                      strokeWidth={2}
                    />
                    <span className="text-body font-medium tracking-[-0.5px] text-brand-ink">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <p className="rounded-[8px] bg-brand-secondary/10 px-5 py-4 text-small text-brand-ink">
              {CONSENT_TEXT}
            </p>

            <div className="mt-auto flex flex-wrap justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={cancel}
                className="h-9 rounded-[8px] border-brand-secondary bg-brand-surface px-5 text-small font-semibold text-brand-secondary hover:bg-brand-secondary/10"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={start}
                disabled={!ready}
                className="h-9 rounded-[8px] bg-brand-secondary px-6 text-small font-semibold text-white hover:bg-brand-secondary/90"
              >
                Agree &amp; Start Interview
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
