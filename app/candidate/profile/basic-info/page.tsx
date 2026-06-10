import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { BasicInfoForm } from "./BasicInfoForm";
import type { BasicInfoValues } from "../schemas";

export default async function BasicInfoPage() {
  const user = await getCurrentUser();
  const profile = user
    ? await prisma.candidateProfile.findUnique({
        where: { userId: user.id },
      })
    : null;

  // Map the DB row to string-shaped form defaults (null -> "", number -> string).
  const defaults: BasicInfoValues = {
    firstName: profile?.firstName ?? "",
    lastName: profile?.lastName ?? "",
    country: profile?.country ?? "",
    city: profile?.city ?? "",
    phone: profile?.phone ?? "",
    linkedinUrl: profile?.linkedinUrl ?? "",
    expectedSalary:
      profile?.expectedSalary != null ? String(profile.expectedSalary) : "",
    nationality: profile?.nationality ?? "",
    languages: profile?.languages ?? [],
    totalYearsExperience:
      profile?.totalYearsExperience != null
        ? String(profile.totalYearsExperience)
        : "",
    preferredRole: profile?.preferredRole ?? "",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Basic information</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          The essentials employers see first.
        </p>
      </div>
      <BasicInfoForm defaultValues={defaults} />
    </div>
  );
}
