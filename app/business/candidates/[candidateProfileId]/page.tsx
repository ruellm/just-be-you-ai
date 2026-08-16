import { notFound, redirect } from "next/navigation";
import { candidateAppliedToCompany, getCurrentCompany } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { EMPLOYMENT_TYPE_LABELS } from "@/app/candidate/profile/schemas";
import {
  CandidateProfileView,
  type ApplicationDTO,
  type ProfileDTO,
} from "./CandidateProfileView";

function initialsOf(first: string | null, last: string | null, email: string) {
  const letters = [first, last]
    .filter(Boolean)
    .map((p) => (p as string).charAt(0).toUpperCase());
  return letters.join("") || email.charAt(0).toUpperCase() || "?";
}

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

export default async function CandidateDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ candidateProfileId: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { candidateProfileId } = await params;
  const { from } = await searchParams;

  const company = await getCurrentCompany();
  if (!company) redirect("/login");

  // Authorization: candidate must have applied to one of this company's jobs.
  const allowed = await candidateAppliedToCompany(company.id, candidateProfileId);
  if (!allowed) notFound();

  const profile = await prisma.candidateProfile.findUnique({
    where: { id: candidateProfileId },
    include: {
      user: { select: { email: true } },
      educations: { orderBy: { startDate: "desc" } },
      skills: { include: { skill: true }, orderBy: { skill: { name: "asc" } } },
      workExperiences: { orderBy: { startDate: "desc" } },
      // Projects are a standalone profile section (profile redesign P3).
      projects: {
        orderBy: { startDate: "desc" },
        include: { skills: { include: { skill: true } } },
      },
    },
  });
  if (!profile) notFound();

  // This company's applications from this candidate (with results).
  const applications = await prisma.application.findMany({
    where: { candidateProfileId, job: { companyId: company.id } },
    orderBy: { createdAt: "desc" },
    include: { job: { select: { title: true } }, interviewResult: true },
  });

  const fullName =
    [profile.firstName, profile.lastName].filter(Boolean).join(" ") ||
    profile.user.email;

  const fromJob =
    typeof from === "string" && from.startsWith("job:") ? from.slice(4) : null;
  const backHref = fromJob ? `/business/jobs/${fromJob}` : "/business/jobs";

  const profileDto: ProfileDTO = {
    id: profile.id,
    fullName,
    initials: initialsOf(profile.firstName, profile.lastName, profile.user.email),
    email: profile.user.email,
    resumeUrl: profile.resumeUrl,
    country: profile.country,
    city: profile.city,
    nationality: profile.nationality,
    phone: profile.phone,
    linkedinUrl: profile.linkedinUrl,
    expectedSalary: profile.expectedSalary,
    totalYearsExperience: profile.totalYearsExperience,
    preferredRole: profile.preferredRole,
    languages: profile.languages,
    joinedAt: profile.createdAt.toISOString(),
    summary: profile.summary,
    skills: profile.skills.map((s) => ({
      id: s.id,
      name: s.skill.name,
      years: s.yearsOfExperience,
    })),
    workExperiences: profile.workExperiences.map((w) => ({
      id: w.id,
      position: w.position,
      companyName: w.companyName,
      employmentType: EMPLOYMENT_TYPE_LABELS[w.employmentType],
      startDate: iso(w.startDate),
      endDate: iso(w.endDate),
      currentlyWorking: w.currentlyWorking,
      description: w.description,
    })),
    educations: profile.educations.map((e) => ({
      id: e.id,
      school: e.school,
      degree: e.degree,
      fieldOfStudy: e.fieldOfStudy,
      country: e.country,
      startDate: iso(e.startDate),
      endDate: iso(e.endDate),
      currentlyStudying: e.currentlyStudying,
    })),
    projects: profile.projects.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      startDate: iso(p.startDate),
      endDate: iso(p.endDate),
      ongoing: p.ongoing,
      skills: p.skills.map((ps) => ps.skill.name),
    })),
  };

  const applicationDtos: ApplicationDTO[] = applications.map((app) => ({
    id: app.id,
    status: app.status,
    jobTitle: app.job.title,
    interviewResult: app.interviewResult
      ? {
          score: app.interviewResult.score,
          tier: app.interviewResult.tier,
          recommendation: app.interviewResult.recommendation,
          fitSummary: app.interviewResult.fitSummary,
          strengthsJson: app.interviewResult.strengthsJson,
          concernsJson: app.interviewResult.concernsJson,
          rubricScoresJson: app.interviewResult.rubricScoresJson,
          compositeScore: app.interviewResult.compositeScore,
          verdict: app.interviewResult.verdict,
          gatesFiredJson: app.interviewResult.gatesFiredJson,
          transcript: app.interviewResult.transcript,
          completedAt: app.interviewResult.completedAt.toISOString(),
        }
      : null,
  }));

  return (
    <CandidateProfileView
      profile={profileDto}
      applications={applicationDtos}
      backHref={backHref}
    />
  );
}
