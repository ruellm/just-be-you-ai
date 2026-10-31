import { getCurrentCompany } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Transcript access for the View Transcript page and the .txt download. The
// signed-in company must own the job the application belongs to and must have
// unlocked the candidate's profile (same ProfileUnlock row the resume uses).
// Returns null for anything else so callers can answer 404.
export async function loadUnlockedTranscript(
  candidateProfileId: string,
  applicationId: string
) {
  const company = await getCurrentCompany();
  if (!company) return null;

  const application = await prisma.application.findFirst({
    where: {
      id: applicationId,
      candidateProfileId,
      job: { companyId: company.id },
    },
    select: {
      job: { select: { title: true } },
      candidateProfile: { select: { firstName: true, lastName: true } },
      interviewResult: { select: { transcript: true, completedAt: true } },
    },
  });
  if (!application?.interviewResult) return null;

  const unlock = await prisma.profileUnlock.findUnique({
    where: {
      companyId_candidateProfileId: { companyId: company.id, candidateProfileId },
    },
    select: { id: true },
  });
  if (!unlock) return null;

  return {
    jobTitle: application.job?.title ?? "",
    firstName: application.candidateProfile.firstName,
    lastName: application.candidateProfile.lastName,
    transcript: application.interviewResult.transcript,
    completedAt: application.interviewResult.completedAt,
  };
}
