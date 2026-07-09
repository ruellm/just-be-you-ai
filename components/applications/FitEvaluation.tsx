import { ThumbsDown, ThumbsUp } from "lucide-react";
import { humanizeDimension, parseEvidence } from "@/lib/applications";

// Phase 2.3 — renders the qualitative fit evaluation (summary + strengths +
// concerns) produced by the Claude grader. Shared by the candidate result page
// and the business candidate-detail page. The recommendation badge and score/
// tier are rendered by the callers alongside their own layout.
export function FitEvaluation({
  fitSummary,
  strengthsJson,
  concernsJson,
}: {
  fitSummary: string | null | undefined;
  strengthsJson: unknown;
  concernsJson: unknown;
}) {
  const strengths = parseEvidence(strengthsJson);
  const concerns = parseEvidence(concernsJson);
  const summary = (fitSummary ?? "").trim();

  if (!summary && strengths.length === 0 && concerns.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {summary ? (
        <div>
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Fit summary
          </p>
          <p className="mt-1 text-sm whitespace-pre-line">{summary}</p>
        </div>
      ) : null}

      {strengths.length ? (
        <EvidenceList
          title="Strengths"
          items={strengths}
          icon={
            <ThumbsUp className="mt-0.5 size-4 shrink-0 text-green-600 dark:text-green-400" />
          }
        />
      ) : null}

      {concerns.length ? (
        <EvidenceList
          title="Concerns"
          items={concerns}
          icon={
            <ThumbsDown className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          }
        />
      ) : null}
    </div>
  );
}

function EvidenceList({
  title,
  items,
  icon,
}: {
  title: string;
  items: { dimension: string; evidence: string }[];
  icon: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {title}
      </p>
      <ul className="mt-2 space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm">
            {icon}
            <span>
              <span className="font-medium">
                {humanizeDimension(item.dimension)}:
              </span>{" "}
              <span className="text-muted-foreground">{item.evidence}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
