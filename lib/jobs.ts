import type { Level, WorkMode } from "@prisma/client";

export const WORK_MODES: WorkMode[] = ["onsite", "remote", "hybrid"];
export const LEVELS: Level[] = ["entry", "novice", "advanced", "expert"];

export const WORK_MODE_LABELS: Record<WorkMode, string> = {
  onsite: "On-site",
  remote: "Remote",
  hybrid: "Hybrid",
};

export const LEVEL_LABELS: Record<Level, string> = {
  entry: "Entry",
  novice: "Novice",
  advanced: "Advanced",
  expert: "Expert",
};

// "₱X – ₱Y / month" only when both bounds are set; otherwise null (hidden).
export function formatSalary(
  min: number | null,
  max: number | null
): string | null {
  if (min == null || max == null) return null;
  const peso = (n: number) => `₱${n.toLocaleString("en-PH")}`;
  return `${peso(min)} – ${peso(max)} / month`;
}

export function postedAgo(date: Date): string {
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days <= 0) return "Posted today";
  if (days === 1) return "Posted 1 day ago";
  if (days < 30) return `Posted ${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "Posted 1 month ago" : `Posted ${months} months ago`;
}

export function companyInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}
