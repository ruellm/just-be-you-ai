import { getCandidateProfileId, dateToInput } from "@/lib/profile";
import { prisma } from "@/lib/db";
import { EducationSection, type EducationDTO } from "./EducationSection";

export default async function EducationPage() {
  const profileId = await getCandidateProfileId();
  const rows = profileId
    ? await prisma.education.findMany({
        where: { candidateProfileId: profileId },
        orderBy: { startDate: "desc" },
      })
    : [];

  const educations: EducationDTO[] = rows.map((e) => ({
    id: e.id,
    school: e.school,
    country: e.country ?? "",
    degree: e.degree ?? "",
    fieldOfStudy: e.fieldOfStudy ?? "",
    startDate: dateToInput(e.startDate),
    endDate: dateToInput(e.endDate),
    currentlyStudying: e.currentlyStudying,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Education</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Add your schools, degrees, and fields of study.
        </p>
      </div>
      <EducationSection educations={educations} />
    </div>
  );
}
