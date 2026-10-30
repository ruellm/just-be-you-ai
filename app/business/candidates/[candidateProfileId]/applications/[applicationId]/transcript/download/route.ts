import {
  formatTranscriptLines,
  parseTranscriptTurns,
  transcriptFilename,
} from "@/lib/transcript";
import { loadUnlockedTranscript } from "../load-transcript";

// Serves the interview transcript as a .txt attachment. Same access rules and
// line format as the View Transcript page.
export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ candidateProfileId: string; applicationId: string }>;
  }
) {
  const { candidateProfileId, applicationId } = await params;
  const data = await loadUnlockedTranscript(candidateProfileId, applicationId);
  if (!data) return new Response("Not found", { status: 404 });

  const body = formatTranscriptLines(
    parseTranscriptTurns(data.transcript),
    data.firstName
  ).join("\n");
  const filename = transcriptFilename(data.jobTitle, data.lastName);

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
