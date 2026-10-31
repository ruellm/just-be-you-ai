import { prisma } from "@/lib/db";
import { unlockedApplicationAccess } from "../unlocked-access";

// Transcript data for the View Transcript page and the .txt download, behind
// the shared unlocked-application access check. Returns null for anything the
// company may not see so callers can answer 404.
export async function loadUnlockedTranscript(
  candidateProfileId: string,
  applicationId: string
) {
  const access = await unlockedApplicationAccess(candidateProfileId, applicationId);
  if (!access) return null;

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    select: {
      job: { select: { title: true } },
      candidateProfile: { select: { firstName: true, lastName: true } },
      interviewResult: { select: { transcript: true, completedAt: true } },
    },
  });
  if (!application?.interviewResult) return null;

  return {
    jobTitle: application.job?.title ?? "",
    firstName: application.candidateProfile.firstName,
    lastName: application.candidateProfile.lastName,
    transcript: application.interviewResult.transcript,
    completedAt: application.interviewResult.completedAt,
  };
}
