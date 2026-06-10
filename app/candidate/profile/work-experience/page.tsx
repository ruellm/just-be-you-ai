import { getCandidateProfileId, dateToInput } from "@/lib/profile";
import { prisma } from "@/lib/db";
import {
  WorkExperienceSection,
  type WorkExperienceDTO,
} from "./WorkExperienceSection";
import type { EmploymentTypeValue } from "../schemas";
import type { SkillOption } from "@/components/profile/SkillCombobox";

export default async function WorkExperiencePage() {
  const profileId = await getCandidateProfileId();

  const [rows, allSkills] = await Promise.all([
    profileId
      ? prisma.workExperience.findMany({
          where: { candidateProfileId: profileId },
          orderBy: { startDate: "desc" },
          include: {
            projects: {
              orderBy: { startDate: "desc" },
              include: { skills: { include: { skill: true } } },
            },
          },
        })
      : Promise.resolve([]),
    prisma.skill.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const experiences: WorkExperienceDTO[] = rows.map((w) => ({
    id: w.id,
    position: w.position,
    companyName: w.companyName,
    startDate: dateToInput(w.startDate),
    endDate: dateToInput(w.endDate),
    currentlyWorking: w.currentlyWorking,
    employmentType: w.employmentType as EmploymentTypeValue,
    description: w.description ?? "",
    projects: w.projects.map((p) => ({
      id: p.id,
      name: p.name,
      url: p.url ?? "",
      startDate: dateToInput(p.startDate),
      endDate: dateToInput(p.endDate),
      ongoing: p.ongoing,
      description: p.description ?? "",
      skillIds: p.skills.map((ps) => ps.skillId),
      skillNames: p.skills.map((ps) => ps.skill.name),
    })),
  }));

  const skillOptions: SkillOption[] = allSkills;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Work experience</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Add roles you&apos;ve held and the projects you worked on.
        </p>
      </div>
      <WorkExperienceSection
        experiences={experiences}
        skillOptions={skillOptions}
      />
    </div>
  );
}
