import { getCurrentCompany } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Business access to one application's details (transcript, generated
// questions). The signed-in company must own the job the application belongs
// to and must have unlocked the candidate's profile (the same ProfileUnlock
// row the resume uses). False for anything else, so callers answer 404.
export async function unlockedApplicationAccess(
  candidateProfileId: string,
  applicationId: string
): Promise<boolean> {
  const company = await getCurrentCompany();
  if (!company) return false;

  const application = await prisma.application.findFirst({
    where: {
      id: applicationId,
      candidateProfileId,
      job: { companyId: company.id },
    },
    select: { id: true },
  });
  if (!application) return false;

  const unlock = await prisma.profileUnlock.findUnique({
    where: {
      companyId_candidateProfileId: { companyId: company.id, candidateProfileId },
    },
    select: { id: true },
  });
  return unlock != null;
}
