import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { formatTranscriptLines, parseTranscriptTurns } from "@/lib/transcript";
import { loadUnlockedTranscript } from "./load-transcript";

export default async function ViewTranscriptPage({
  params,
}: {
  params: Promise<{ candidateProfileId: string; applicationId: string }>;
}) {
  const { candidateProfileId, applicationId } = await params;
  const data = await loadUnlockedTranscript(candidateProfileId, applicationId);
  if (!data) notFound();

  const lines = formatTranscriptLines(
    parseTranscriptTurns(data.transcript),
    data.firstName
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-10 font-body lg:px-14 lg:py-14">
      <Link
        href={`/business/candidates/${candidateProfileId}`}
        className="inline-flex items-center gap-2 text-subheading font-semibold tracking-[-0.96px] text-brand-primary hover:underline"
      >
        <ArrowLeft className="size-5" /> Back to Previous
      </Link>

      <h1 className="text-page-title font-semibold tracking-[-0.5px] text-brand-primary">
        View Transcript
      </h1>

      <section className="space-y-5 rounded-[12px] border border-brand-border bg-brand-surface p-6 sm:p-7">
        {lines.length === 0 ? (
          <p className="text-body text-brand-ink-secondary">
            This interview has no recorded dialogue.
          </p>
        ) : (
          lines.map((line, i) => (
            <p
              key={i}
              className="text-body font-medium tracking-[-0.5px] whitespace-pre-line text-brand-ink"
            >
              {line}
            </p>
          ))
        )}
      </section>
    </div>
  );
}
