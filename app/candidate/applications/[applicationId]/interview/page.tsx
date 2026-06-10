import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { InterviewExperience } from "./InterviewExperience";

export default async function InterviewPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = await params;

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const profile = await prisma.candidateProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!profile) redirect("/candidate/profile/basic-info");

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    select: {
      id: true,
      candidateProfileId: true,
      status: true,
      job: { select: { title: true, company: { select: { name: true } } } },
    },
  });

  if (!application || application.candidateProfileId !== profile.id) {
    notFound();
  }
  // Already interviewed → straight to the result.
  if (application.status !== "submitted" && application.status !== "draft") {
    redirect(`/candidate/applications/${applicationId}/result`);
  }

  return (
    <InterviewExperience
      applicationId={application.id}
      jobTitle={application.job.title}
      companyName={application.job.company.name}
    />
  );
}
