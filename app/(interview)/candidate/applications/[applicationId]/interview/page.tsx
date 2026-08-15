import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { InterviewExperience } from "./InterviewExperience";
import { AdvancedInterviewExperience } from "./AdvancedInterviewExperience";

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
  if (!profile) redirect("/candidate/profile");

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    select: {
      id: true,
      candidateProfileId: true,
      status: true,
      job: {
        select: {
          title: true,
          voiceAgentType: true,
          company: { select: { name: true } },
        },
      },
    },
  });

  if (!application || application.candidateProfileId !== profile.id) {
    notFound();
  }
  // Already interviewed → straight to the result.
  if (application.status !== "submitted" && application.status !== "draft") {
    redirect(`/candidate/applications/${applicationId}/result`);
  }

  // Phase 3.3 — branch on the job's voice engine: "advanced" runs the
  // ElevenLabs path; everything else runs the existing basic (LiveKit) path.
  if (application.job.voiceAgentType === "advanced") {
    return (
      <AdvancedInterviewExperience
        applicationId={application.id}
        jobTitle={application.job.title}
        companyName={application.job.company.name}
      />
    );
  }

  return (
    <InterviewExperience
      applicationId={application.id}
      jobTitle={application.job.title}
      companyName={application.job.company.name}
    />
  );
}
