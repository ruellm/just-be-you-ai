"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { gradeAdvancedInterview } from "@/lib/elevenlabs/grade-advanced-interview";

// Phase 3.4 — the grading SAFETY NET. The primary trigger is the detached run
// completeAdvancedInterview kicks off, but a detached task dies with a server
// restart; this action re-runs grading from the result page's existing poll
// (each router.refresh() re-renders the server component, which fires this
// detached). gradeAdvancedInterview is idempotent + in-flight-guarded, so the
// double trigger (detached task + poll every 2s) is safe and cheap.

const idSchema = z.string().min(1);

/**
 * Run gradeAdvancedInterview only for the caller's own ADVANCED application
 * that is `interview_completed` with no InterviewResult row yet. Everything
 * else — basic-tier applications (the Python worker grades those), already
 * graded, still interviewable — is a silent no-op.
 */
export async function ensureAdvancedGraded(rawApplicationId: string): Promise<void> {
  const applicationId = idSchema.parse(rawApplicationId);

  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const profile = await prisma.candidateProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!profile) throw new Error("No candidate profile");

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    select: {
      candidateProfileId: true,
      status: true,
      job: { select: { voiceAgentType: true } },
      interviewResult: { select: { id: true } },
    },
  });
  // Ownership check — never grade on behalf of another candidate's poll.
  if (!application || application.candidateProfileId !== profile.id) {
    throw new Error("Application not found");
  }

  if (application.job.voiceAgentType !== "advanced") return;
  if (application.status !== "interview_completed") return;
  if (application.interviewResult) return;

  await gradeAdvancedInterview(applicationId);
}
