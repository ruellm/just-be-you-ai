// Phase 3.4 — fetch a finished ElevenLabs conversation's transcript and
// reshape it into the exact stored format the basic (LiveKit) path writes and
// the ported evaluator consumes: one "AI: …" / "Candidate: …" line per turn
// (see voice-agent/lib/interview_flow.py#build_transcript_text).
//
// ElevenLabs processes the conversation asynchronously after it ends, so the
// transcript isn't complete until `status === "done"` — we poll with backoff
// up to ~90s. A conversation that never becomes ready throws the typed
// TranscriptNotReadyError so the caller can distinguish "try again later"
// (leave the application at interview_completed; the result-page poll will
// re-trigger grading) from a real failure.
//
// Uses ELEVENLABS_API_KEY — a SERVER-side workspace key (ConvAI read scope),
// deliberately separate from the public NEXT_PUBLIC_ELEVENLABS_AGENT_ID.

const API_BASE = "https://api.elevenlabs.io/v1/convai/conversations";
const POLL_TIMEOUT_MS = 90_000;
const INITIAL_DELAY_MS = 2_000;
const MAX_DELAY_MS = 10_000;

/** The conversation exists but its transcript never reached `done` in time. */
export class TranscriptNotReadyError extends Error {
  constructor(conversationId: string) {
    super(
      `ElevenLabs conversation ${conversationId} transcript not ready within ${POLL_TIMEOUT_MS / 1000}s.`
    );
    this.name = "TranscriptNotReadyError";
  }
}

type ConversationResponse = {
  status?: string; // "initiated" | "in-progress" | "processing" | "done" | "failed"
  transcript?: Array<{
    role?: "agent" | "user" | string;
    message?: string | null;
  }>;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// agent → AI, user → Candidate — the labels the evaluator (and the transcript
// viewers) expect. Turns without spoken text (tool calls etc.) are skipped,
// matching the Python capture which only records committed spoken turns.
function reshapeTranscript(entries: ConversationResponse["transcript"]): string {
  const lines: string[] = [];
  for (const entry of entries ?? []) {
    const text = entry.message?.trim();
    if (!text) continue;
    lines.push(`${entry.role === "user" ? "Candidate" : "AI"}: ${text}`);
  }
  return lines.join("\n");
}

/**
 * Fetch the transcript of one ElevenLabs conversation, polling until the
 * conversation has finished processing (`status === "done"`).
 *
 * @returns the transcript in `AI:`/`Candidate:` line format (may be "" if the
 *   candidate said nothing — the evaluator handles that).
 * @throws TranscriptNotReadyError if it doesn't become ready within ~90s.
 * @throws Error on missing config, auth/not-found responses, or a
 *   conversation ElevenLabs marked as failed.
 */
export async function fetchConversationTranscript(
  conversationId: string
): Promise<string> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not set.");

  const url = `${API_BASE}/${encodeURIComponent(conversationId)}`;
  const started = Date.now();
  let delay = INITIAL_DELAY_MS;

  for (;;) {
    const response = await fetch(url, {
      headers: { "xi-api-key": apiKey },
      cache: "no-store",
    });

    if (response.ok) {
      const data = (await response.json()) as ConversationResponse;
      if (data.status === "done") return reshapeTranscript(data.transcript);
      if (data.status === "failed") {
        throw new Error(
          `ElevenLabs conversation ${conversationId} failed processing.`
        );
      }
      // initiated / in-progress / processing → keep polling.
    } else if (response.status < 500) {
      // 401/403/404 etc. — polling won't fix these.
      throw new Error(
        `ElevenLabs conversation fetch failed: HTTP ${response.status}`
      );
    }
    // 5xx → transient; retry within the same budget.

    if (Date.now() - started + delay > POLL_TIMEOUT_MS) {
      throw new TranscriptNotReadyError(conversationId);
    }
    await sleep(delay);
    delay = Math.min(delay * 1.5, MAX_DELAY_MS);
  }
}
