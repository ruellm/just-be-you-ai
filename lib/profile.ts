import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// The current candidate's CandidateProfile id, creating an empty profile if one
// doesn't exist yet. Returns null only when nobody is signed in. Used by the
// profile sub-section actions to scope rows to the right candidate.
export async function getCandidateProfileId(): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const profile = await prisma.candidateProfile.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
    select: { id: true },
  });
  return profile.id;
}

// Date <-> <input type="date"> string ("YYYY-MM-DD").
export function dateToInput(date: Date | null | undefined): string {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

export function toDateOrNull(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date;
}
