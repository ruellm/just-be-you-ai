// SERVER-ONLY: this module pulls in auth (next/headers) via lib/auth. Pure
// display/format helpers live in lib/profile-format.ts — import those from
// client components, never this file.
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
