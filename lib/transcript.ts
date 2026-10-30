// Stored interview transcripts are one "AI: ..." / "Candidate: ..." line per
// turn. Both interview tiers write this format (voice-agent save_result.py and
// lib/elevenlabs/fetch-transcript.ts).

export type TranscriptTurn = {
  speaker: "ai" | "candidate" | null;
  text: string;
};

export function parseTranscriptTurns(transcript: string): TranscriptTurn[] {
  const turns: TranscriptTurn[] = [];
  for (const rawLine of transcript.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const match = /^(AI|Candidate):\s*(.*)$/.exec(line);
    if (match) {
      turns.push({
        speaker: match[1] === "AI" ? "ai" : "candidate",
        text: match[2],
      });
    } else if (turns.length > 0) {
      // No speaker label: the previous turn continues.
      turns[turns.length - 1].text += `\n${line}`;
    } else {
      turns.push({ speaker: null, text: line });
    }
  }
  return turns;
}

export function transcriptSpeakerLabel(
  speaker: TranscriptTurn["speaker"],
  candidateFirstName: string | null | undefined
): string | null {
  if (speaker === "ai") return "AI Interviewer";
  if (speaker === "candidate") return candidateFirstName?.trim() || "Candidate";
  return null;
}

// "AI Interviewer: ..." / "{first name}: ..." lines, in turn order. Used by
// both the View Transcript page and the .txt download.
export function formatTranscriptLines(
  turns: TranscriptTurn[],
  candidateFirstName: string | null | undefined
): string[] {
  return turns.map((turn) => {
    const label = transcriptSpeakerLabel(turn.speaker, candidateFirstName);
    return label ? `${label}: ${turn.text}` : turn.text;
  });
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function transcriptFilename(
  jobTitle: string,
  candidateLastName: string | null | undefined
): string {
  const parts = ["transcript", slugify(jobTitle), slugify(candidateLastName ?? "")]
    .filter(Boolean);
  return `${parts.join("-")}.txt`;
}
