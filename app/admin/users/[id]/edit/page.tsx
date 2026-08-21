import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { userDisplayName } from "@/lib/admin";
import { dateToInput, parseResumeMeta } from "@/lib/profile-format";
import { EditUserForm } from "./EditUserForm";

export default async function AdminEditUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      candidateProfile: {
        include: {
          skills: { include: { skill: true }, orderBy: { yearsOfExperience: "desc" } },
          educations: { orderBy: { startDate: "desc" } },
          workExperiences: { orderBy: { startDate: "desc" } },
          projects: {
            include: { skills: { include: { skill: true } } },
            orderBy: { startDate: "desc" },
          },
        },
      },
      company: true,
    },
  });
  if (!user) notFound();

  const p = user.candidateProfile;

  return (
    <div className="space-y-6 px-6 py-8 font-body lg:px-14">
      <Link
        href={`/admin/users/${user.id}`}
        className="inline-flex items-center gap-2 text-subheading font-semibold tracking-[-0.5px] text-brand-primary hover:underline"
      >
        <ArrowLeft className="size-5" /> Back to Previous
      </Link>

      <EditUserForm
        userId={user.id}
        role={user.role}
        email={user.email}
        displayName={userDisplayName(user)}
        company={user.company ? { name: user.company.name } : null}
        profile={
          p
            ? {
                firstName: p.firstName ?? "",
                middleName: p.middleName ?? "",
                lastName: p.lastName ?? "",
                suffix: p.suffix ?? "",
                country: p.country ?? "",
                city: p.city ?? "",
                nationality: p.nationality ?? "",
                phone: p.phone ?? "",
                linkedinUrl: p.linkedinUrl ?? "",
                expectedSalary: p.expectedSalary?.toString() ?? "",
                totalYearsExperience: p.totalYearsExperience?.toString() ?? "",
                preferredRole: p.preferredRole ?? "",
                languages: p.languages,
                summary: p.summary ?? "",
                resume: parseResumeMeta(p.resumeUrl),
                educations: p.educations.map((e) => ({
                  id: e.id,
                  school: e.school,
                  degree: e.degree,
                  fieldOfStudy: e.fieldOfStudy,
                  country: e.country,
                  start: dateToInput(e.startDate),
                  end: dateToInput(e.endDate),
                  current: e.currentlyStudying,
                })),
                skills: p.skills.map((s) => ({
                  id: s.id,
                  name: s.skill.name,
                  years: s.yearsOfExperience,
                })),
                workExperiences: p.workExperiences.map((w) => ({
                  id: w.id,
                  position: w.position,
                  companyName: w.companyName,
                  employmentType: w.employmentType,
                  start: dateToInput(w.startDate),
                  end: dateToInput(w.endDate),
                  current: w.currentlyWorking,
                  description: w.description,
                })),
                projects: p.projects.map((pr) => ({
                  id: pr.id,
                  name: pr.name,
                  url: pr.url,
                  start: dateToInput(pr.startDate),
                  end: dateToInput(pr.endDate),
                  ongoing: pr.ongoing,
                  description: pr.description,
                  skills: pr.skills.map((s) => s.skill.name),
                })),
              }
            : null
        }
      />
    </div>
  );
}
