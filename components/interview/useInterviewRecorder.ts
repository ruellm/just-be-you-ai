"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  RECORDING_MIME_TYPES,
  RECORDINGS_BUCKET,
} from "@/lib/recording/storage";
import {
  finalizeRecording,
  getPartUploadUrl,
  startRecording,
  type PartUploadTarget,
  type RecordingOutcome,
  type RecordingSession,
} from "@/lib/recording/actions";

// Records the candidate's camera + mic during the interview and uploads the
// footage as 10s parts while the interview runs. Completely separate from the
// voice connection: nothing here touches LiveKit or ElevenLabs, and no failure
// here ever ends or interrupts the interview. If recording cannot start, the
// interview simply runs without the badge.
//
// The hook only knows the stream and a RecordingBackend, so a flow with no
// application (the pre-screening interview) can plug in its own backend.

export type RecordingBackend = {
  start(input: { consentAt: Date; mimeType: string }): Promise<RecordingSession>;
  getPartUploadUrl(recordingId: string, partNumber: number): Promise<PartUploadTarget>;
  finalize(
    recordingId: string,
    partCount: number,
    totalBytes: number,
    outcome: RecordingOutcome
  ): Promise<void>;
};

export function applicationRecordingBackend(applicationId: string): RecordingBackend {
  return {
    start: ({ consentAt, mimeType }) =>
      startRecording(applicationId, consentAt.toISOString(), mimeType),
    getPartUploadUrl,
    finalize: finalizeRecording,
  };
}

const TIMESLICE_MS = 10_000;
const VIDEO_BITS_PER_SECOND = 500_000;
const AUDIO_BITS_PER_SECOND = 32_000;
const UPLOAD_ATTEMPTS = 3;
const RETRY_BASE_MS = 1_000;
const FLUSH_WAIT_MS = 15_000;
const RECORDER_STOP_WAIT_MS = 3_000;

type Part = { number: number; blob: Blob };

function pickMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  return RECORDING_MIME_TYPES.find((t) => MediaRecorder.isTypeSupported(t)) ?? null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function log(message: string, ...rest: unknown[]) {
  console.log(`[recording] ${message}`, ...rest);
}

export function useInterviewRecorder({
  stream,
  active,
  consentAt,
  backend,
}: {
  // The Setup page's camera + mic stream.
  stream: MediaStream | null;
  // True once the interview is actually connected.
  active: boolean;
  consentAt: Date | null;
  backend: RecordingBackend;
}): {
  recording: boolean;
  stop: (outcome?: RecordingOutcome) => Promise<void>;
} {
  const [recording, setRecording] = useState(false);
  const backendRef = useRef(backend);
  backendRef.current = backend;

  // Everything mutable lives in one ref so the callbacks below never go stale.
  const state = useRef({
    started: false,
    stopped: false,
    stopPromise: null as Promise<void> | null,
    recorder: null as MediaRecorder | null,
    session: null as RecordingSession | null,
    mimeType: "",
    nextPartNumber: 1,
    pending: [] as Part[],
    pumping: false,
    uploadedCount: 0,
    uploadedBytes: 0,
    drainWaiters: [] as Array<() => void>,
  }).current;

  const uploadPart = useCallback(
    async (part: Part): Promise<boolean> => {
      const session = state.session;
      if (!session) return false;
      for (let attempt = 0; attempt < UPLOAD_ATTEMPTS; attempt += 1) {
        try {
          const target = await backendRef.current.getPartUploadUrl(
            session.recordingId,
            part.number
          );
          const { error } = await createClient()
            .storage.from(RECORDINGS_BUCKET)
            .uploadToSignedUrl(target.path, target.token, part.blob, {
              contentType: state.mimeType,
            });
          if (error) throw error;
          return true;
        } catch (error) {
          log(`part ${part.number} upload attempt ${attempt + 1} failed:`, error);
          if (attempt < UPLOAD_ATTEMPTS - 1) {
            await sleep(RETRY_BASE_MS * 3 ** attempt);
          }
        }
      }
      return false;
    },
    [state]
  );

  // Uploads pending parts in order. A part that still fails after its retries
  // stays in memory, with everything behind it, until the next tick calls
  // pump() again.
  const pump = useCallback(async () => {
    if (state.pumping) return;
    state.pumping = true;
    try {
      while (state.pending.length > 0) {
        const part = state.pending[0];
        const ok = await uploadPart(part);
        if (!ok) break;
        state.pending.shift();
        state.uploadedCount += 1;
        state.uploadedBytes += part.blob.size;
      }
    } finally {
      state.pumping = false;
      if (state.pending.length === 0) {
        state.drainWaiters.splice(0).forEach((resolve) => resolve());
      }
    }
  }, [state, uploadPart]);

  const waitForDrain = useCallback(
    (timeoutMs: number) =>
      new Promise<void>((resolve) => {
        if (state.pending.length === 0 && !state.pumping) {
          resolve();
          return;
        }
        const timer = setTimeout(resolve, timeoutMs);
        state.drainWaiters.push(() => {
          clearTimeout(timer);
          resolve();
        });
      }),
    [state]
  );

  const stop = useCallback(
    (outcome: RecordingOutcome = "complete"): Promise<void> => {
      if (state.stopPromise) return state.stopPromise;
      state.stopped = true;
      setRecording(false);
      state.stopPromise = (async () => {
        const recorder = state.recorder;
        if (recorder && recorder.state !== "inactive") {
          // The final dataavailable fires before stop.
          await Promise.race([
            new Promise<void>((resolve) =>
              recorder.addEventListener("stop", () => resolve(), { once: true })
            ),
            sleep(RECORDER_STOP_WAIT_MS),
          ]);
        }
        if (!state.session) return;
        void pump();
        await waitForDrain(FLUSH_WAIT_MS);
        if (state.pending.length > 0) {
          log(`${state.pending.length} part(s) were not uploaded before finalize`);
        }
        try {
          await backendRef.current.finalize(
            state.session.recordingId,
            state.uploadedCount,
            state.uploadedBytes,
            outcome
          );
          log(`finalized as ${outcome}: ${state.uploadedCount} part(s)`);
        } catch (error) {
          log("finalize failed:", error);
        }
      })();
      return state.stopPromise;
    },
    [state, pump, waitForDrain]
  );

  // Start once the interview is live and the stream is available.
  useEffect(() => {
    if (!active || !stream || !consentAt || state.started) return;
    state.started = true;

    (async () => {
      const tracks = [...stream.getVideoTracks(), ...stream.getAudioTracks()].filter(
        (t) => t.readyState === "live"
      );
      if (tracks.length === 0) {
        log("no live tracks to record; interview continues without recording");
        return;
      }
      const mimeType = pickMimeType();
      if (!mimeType) {
        log("MediaRecorder unsupported or no supported mime type; not recording");
        return;
      }

      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(new MediaStream(tracks), {
          mimeType,
          videoBitsPerSecond: VIDEO_BITS_PER_SECOND,
          audioBitsPerSecond: AUDIO_BITS_PER_SECOND,
        });
      } catch (error) {
        log("could not create MediaRecorder; not recording:", error);
        return;
      }

      try {
        state.session = await backendRef.current.start({ consentAt, mimeType });
      } catch (error) {
        log("could not create the recording row; not recording:", error);
        return;
      }
      if (state.stopped) return;
      state.mimeType = mimeType;
      state.recorder = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size === 0) return;
        state.pending.push({ number: state.nextPartNumber, blob: event.data });
        state.nextPartNumber += 1;
        void pump();
      };
      recorder.onerror = (event) => {
        log("recorder error:", (event as ErrorEvent).error ?? event);
      };
      // The recorder stops on its own when every track has ended.
      recorder.onstop = () => {
        if (!state.stopped) {
          log("recorder stopped because all tracks ended; finalizing as incomplete");
          void stop("incomplete");
        }
      };

      // A track can end mid-interview (device unplugged, Safari handing the
      // mic to the voice SDK). Keep going with what is left; only when nothing
      // is left does the recorder stop.
      for (const track of tracks) {
        track.addEventListener("ended", () => {
          const live = tracks.filter((t) => t.readyState === "live");
          log(`${track.kind} track ended; ${live.length} track(s) still recording`);
          if (live.length === 0 && recorder.state !== "inactive") {
            void stop("incomplete");
          }
        });
      }

      recorder.start(TIMESLICE_MS);
      setRecording(true);
      log(`started (${mimeType})`);
    })();
  }, [active, stream, consentAt, state, pump, stop]);

  // Leaving the page without a normal end still flushes what it can.
  useEffect(
    () => () => {
      if (state.started && !state.stopped) void stop("incomplete");
    },
    [state, stop]
  );

  return { recording, stop };
}
