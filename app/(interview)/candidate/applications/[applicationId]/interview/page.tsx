import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PRESCREEN_DURATION_MINUTES } from "@/lib/prescreen";
import { InterviewExperience } from "./InterviewExperience";
import { AdvancedInterviewExperience } from "./AdvancedInterviewExperience";

// Matches DEFAULT_MAX_MINUTES in voice-agent/lib/interview_flow.py, the cap the
// agent applies when the job sets none.
const DEFAULT_INTERVIEW_MINUTES = 30;

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
    select: { id: true, firstName: true },
  });
  if (!profile) redirect("/candidate/profile");

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    select: {
      id: true,
      candidateProfileId: true,
      status: true,
      kind: true,
      job: {
        select: {
          title: true,
          voiceAgentType: true,
          interviewMaxMinutes: true,
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

  const candidateName = profile.firstName?.trim() || "You";
  // A pre-screen has no job: fixed length, always the basic tier.
  const durationMinutes =
    application.kind === "prescreen"
      ? PRESCREEN_DURATION_MINUTES
      : (application.job?.interviewMaxMinutes ?? DEFAULT_INTERVIEW_MINUTES);

  // Phase 3.3 — branch on the job's voice engine: "advanced" runs the
  // ElevenLabs path; everything else runs the existing basic (LiveKit) path.
  if (application.job?.voiceAgentType === "advanced") {
    return (
      <AdvancedInterviewExperience
        applicationId={application.id}
        candidateName={candidateName}
        durationMinutes={durationMinutes}
      />
    );
  }

  return (
    <InterviewExperience
      applicationId={application.id}
      candidateName={candidateName}
      durationMinutes={durationMinutes}
    />
  );
}
