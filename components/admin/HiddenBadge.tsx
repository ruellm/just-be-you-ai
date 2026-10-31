import { Badge } from "@/components/ui/badge";
import { formatLongDate } from "@/lib/dates";

// Admin-only markers for a hidden candidate or company.

export function HiddenBadge() {
  return (
    <Badge
      variant="outline"
      className="border-brand-border text-[10px] font-medium text-accent-2"
    >
      Hidden
    </Badge>
  );
}

export function HiddenNotice({
  hiddenAt,
  reason,
}: {
  hiddenAt: Date | null;
  reason: string | null;
}) {
  if (!hiddenAt) return null;
  return (
    <div className="rounded-[12px] border border-brand-border bg-status-fail px-5 py-4 text-small text-brand-ink">
      <p className="font-semibold text-accent-2">
        Hidden on {formatLongDate(hiddenAt)}
      </p>
      {reason ? (
        <p className="mt-1 whitespace-pre-line">Reason: {reason}</p>
      ) : null}
    </div>
  );
}
