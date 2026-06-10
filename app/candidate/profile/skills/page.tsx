import { getCandidateProfileId } from "@/lib/profile";
import { prisma } from "@/lib/db";
import { SkillsSection, type CandidateSkillDTO } from "./SkillsSection";
import type { SkillOption } from "@/components/profile/SkillCombobox";

export default async function SkillsPage() {
  const profileId = await getCandidateProfileId();

  const [candidateSkillRows, allSkills] = await Promise.all([
    profileId
      ? prisma.candidateSkill.findMany({
          where: { candidateProfileId: profileId },
          include: { skill: true },
          orderBy: { skill: { name: "asc" } },
        })
      : Promise.resolve([]),
    prisma.skill.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const candidateSkills: CandidateSkillDTO[] = candidateSkillRows.map((cs) => ({
    id: cs.id,
    skillId: cs.skillId,
    skillName: cs.skill.name,
    years: cs.yearsOfExperience,
  }));

  const skillOptions: SkillOption[] = allSkills;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Skills</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Add the skills you have and how many years of experience you have with
          each.
        </p>
      </div>
      <SkillsSection
        candidateSkills={candidateSkills}
        skillOptions={skillOptions}
      />
    </div>
  );
}
