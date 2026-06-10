import type { ApplicationStatus, Level } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  APPLICATION_STATUS_BADGE_CLASS,
  APPLICATION_STATUS_LABELS,
  TIER_BADGE_CLASS,
  TIER_LABELS,
} from "@/lib/applications";

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <Badge className={cn("border-transparent", APPLICATION_STATUS_BADGE_CLASS[status])}>
      {APPLICATION_STATUS_LABELS[status]}
    </Badge>
  );
}

export function TierBadge({
  tier,
  className,
}: {
  tier: Level;
  className?: string;
}) {
  return (
    <Badge className={cn("border-transparent", TIER_BADGE_CLASS[tier], className)}>
      {TIER_LABELS[tier]}
    </Badge>
  );
}
