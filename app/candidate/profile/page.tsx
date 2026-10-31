import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { dateToInput, parseResumeMeta } from "@/lib/profile-format";
import type { SkillOption } from "@/components/profile/SkillCombobox";
import { ProfileForm } from "./ProfileForm";
import { ProfileSectionCard } from "./ProfileSectionCard";
import type { EmploymentTypeValue, ProfileFormValues } from "./schemas";
import { ResumeSection } from "./resume/ResumeSection";
import { EducationSection, type EducationDTO } from "./education/EducationSection";
import { SkillsSection, type CandidateSkillDTO } from "./skills/SkillsSection";
import {
  WorkExperienceSection,
  type WorkExperienceDTO,
} from "./work-experience/WorkExperienceSection";
import { ProjectsSection, type ProjectDTO } from "./projects/ProjectsSection";
import { PrescreenBanner } from "@/components/profile/PrescreenBanner";

function initialsOf(first: string, last: string, email: string): string {
  const letters = [first, last]
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase());
  return letters.join("") || email.charAt(0).toUpperCase() || "?";
}

// Single-page candidate profile: every section stacked. Basic Information +
// Profile Summary are one client form (ProfileForm, with the sticky Save
// bar); Resume / Education / Skills / Work Experience keep their existing
// components + actions and just get wrapped in the new section cards.
export default async function ProfilePage() {
  const user = await getCurrentUser();
  const profile = user
    ? await prisma.candidateProfile.findUnique({ where: { userId: user.id } })
    : null;

  // A pre-screen counts as done once it has a result or has left the
  // interviewable statuses (grading in flight included).
  const prescreen = profile
    ? await prisma.application.findFirst({
        where: { candidateProfileId: profile.id, kind: "prescreen" },
        select: { status: true, interviewResult: { select: { id: true } } },
      })
    : null;
  const prescreenDone =
    prescreen != null &&
    (prescreen.interviewResult != null ||
      (prescreen.status !== "submitted" && prescreen.status !== "draft"));

  const [educationRows, candidateSkillRows, workRows, projectRows, allSkills] =
    await Promise.all([
      profile
        ? prisma.education.findMany({
            where: { candidateProfileId: profile.id },
            orderBy: { startDate: "desc" },
          })
        : Promise.resolve([]),
      profile
        ? prisma.candidateSkill.findMany({
            where: { candidateProfileId: profile.id },
            include: { skill: true },
            orderBy: { skill: { name: "asc" } },
          })
        : Promise.resolve([]),
      profile
        ? prisma.workExperience.findMany({
            where: { candidateProfileId: profile.id },
            orderBy: { startDate: "desc" },
          })
        : Promise.resolve([]),
      profile
        ? prisma.project.findMany({
            where: { candidateProfileId: profile.id },
            orderBy: { startDate: "desc" },
            include: { skills: { include: { skill: true } } },
          })
        : Promise.resolve([]),
      prisma.skill.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
    ]);

  // Map the DB row to string-shaped form defaults (null -> "", number -> string).
  const defaults: ProfileFormValues = {
    firstName: profile?.firstName ?? "",
    middleName: profile?.middleName ?? "",
    lastName: profile?.lastName ?? "",
    suffix: profile?.suffix ?? "",
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
    profileImageUrl: profile?.profileImageUrl ?? "",
    summary: profile?.summary ?? "",
  };

  const educations: EducationDTO[] = educationRows.map((e) => ({
    id: e.id,
    school: e.school,
    country: e.country ?? "",
    degree: e.degree ?? "",
    fieldOfStudy: e.fieldOfStudy ?? "",
    startDate: dateToInput(e.startDate),
    endDate: dateToInput(e.endDate),
    currentlyStudying: e.currentlyStudying,
  }));

  const candidateSkills: CandidateSkillDTO[] = candidateSkillRows.map((cs) => ({
    id: cs.id,
    skillId: cs.skillId,
    skillName: cs.skill.name,
    years: cs.yearsOfExperience,
  }));

  const experiences: WorkExperienceDTO[] = workRows.map((w) => ({
    id: w.id,
    position: w.position,
    companyName: w.companyName,
    startDate: dateToInput(w.startDate),
    endDate: dateToInput(w.endDate),
    currentlyWorking: w.currentlyWorking,
    employmentType: w.employmentType as EmploymentTypeValue,
    description: w.description ?? "",
  }));

  const projects: ProjectDTO[] = projectRows.map((p) => ({
    id: p.id,
    name: p.name,
    url: p.url ?? "",
    startDate: dateToInput(p.startDate),
    endDate: dateToInput(p.endDate),
    ongoing: p.ongoing,
    description: p.description ?? "",
    skillIds: p.skills.map((ps) => ps.skillId),
    skillNames: p.skills.map((ps) => ps.skill.name),
  }));

  const skillOptions: SkillOption[] = allSkills;
  const resumeMeta = parseResumeMeta(profile?.resumeUrl ?? null);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-10 pb-32 font-body lg:px-14 lg:py-14 lg:pb-32">
      <div className="space-y-2">
        <h1 className="text-page-title font-semibold text-brand-primary">
          My Profile
        </h1>
        <p className="text-body text-brand-ink-secondary">
          Keep your profile up to date so employers see the real you.
        </p>
      </div>

      <PrescreenBanner
        hasResume={profile?.resumeUrl != null}
        prescreenDone={prescreenDone}
      />

      {/* 1 + 2: Basic Information + Profile Summary (one form + save bar) */}
      <ProfileForm
        defaultValues={defaults}
        initials={initialsOf(
          defaults.firstName,
          defaults.lastName,
          user?.email ?? ""
        )}
        avatarUrl={profile?.avatarUrl ?? null}
      />


      {/* 3–7: Resume / Education / Skills / Work Experience / Projects */}
      <ProfileSectionCard
        id="resume"
        title="Resume"
        subtitle="Upload your resume as a PDF or DOCX file (up to 5MB)."
      >
        <ResumeSection
          filename={resumeMeta?.filename ?? null}
          uploadedAt={resumeMeta?.uploadedAt ?? null}
        />
      </ProfileSectionCard>

      {/* Education + Skills render their own header so the "Add …" button
          can sit top-right of the card next to the heading. */}
      <ProfileSectionCard>
        <EducationSection
          educations={educations}
          title="Education"
          subtitle="Add your schools, degrees, and fields of study."
        />
      </ProfileSectionCard>

      <ProfileSectionCard>
        <SkillsSection
          candidateSkills={candidateSkills}
          skillOptions={skillOptions}
          title="Skills"
          subtitle="Add the skills you have and how many years of experience you have with each."
        />
      </ProfileSectionCard>

      <ProfileSectionCard>
        <WorkExperienceSection
          experiences={experiences}
          title="Work Experience"
          subtitle="Add the professional roles you've held and your key responsibilities."
        />
      </ProfileSectionCard>

      <ProfileSectionCard>
        <ProjectsSection
          projects={projects}
          skillOptions={skillOptions}
          title="Projects"
          subtitle="Add personal, academic, or freelance projects that showcase your skills."
        />
      </ProfileSectionCard>
    </div>
  );
}
