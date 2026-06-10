import type { ApplicationStatus, Level } from "@prisma/client";

// Level ordering for the pass rule: a candidate passes a job when their
// interview tier rank is >= the job's required level rank.
export const LEVEL_RANK: Record<Level, number> = {
  entry: 0,
  novice: 1,
  advanced: 2,
  expert: 3,
};

export const TIER_LABELS: Record<Level, string> = {
  entry: "Entry",
  novice: "Novice",
  advanced: "Advanced",
  expert: "Expert",
};

// Tier badge colors: entry gray, novice blue, advanced green, expert gold.
export const TIER_BADGE_CLASS: Record<Level, string> = {
  entry: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200",
  novice: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  advanced: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  expert: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
};

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  interview_completed: "Interview completed",
  passed: "Passed",
  failed: "Failed",
  archived: "Archived",
};

export const APPLICATION_STATUS_BADGE_CLASS: Record<ApplicationStatus, string> =
  {
    draft: "bg-muted text-muted-foreground",
    submitted: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    interview_completed:
      "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200",
    passed:
      "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
    failed: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
    archived: "bg-muted text-muted-foreground",
  };

// Where a given application should link to, based on its status.
export function applicationPath(id: string, status: ApplicationStatus): string {
  const interviewed =
    status === "interview_completed" ||
    status === "passed" ||
    status === "failed" ||
    status === "archived";
  return `/candidate/applications/${id}/${interviewed ? "result" : "interview"}`;
}

export function scoreToPercent(score: number): number {
  return Math.round(score * 100);
}
