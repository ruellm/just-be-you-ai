"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { gradeAdvancedInterview } from "@/lib/elevenlabs/grade-advanced-interview";

// Phase 3.3 — the ADVANCED-path equivalent of the Python agent's
// mark_interview_completed (voice-agent/lib/save_result.py): the durable
// "interview happened, grading in flight" stamp the candidate result page
// relies on to show its "Finalizing…" pending state. It also records the
// ElevenLabs conversation id so the 3.4 grading session can fetch the
// transcript later. It does NOT grade and does NOT write an InterviewResult
// row — that is the next session's job.

const idSchema = z.string().min(1);
const conversationIdSchema = z.string().min(1).nullable();

/**
 * Stamp an advanced interview as completed.
 *
 * Writes `voiceConversationId` and flips status → `interview_completed`, but
 * ONLY if the application is still in an interviewable status
 * (`submitted`/`draft`) — a repeat call (StrictMode, double disconnect) or a
 * stale tab can never regress a graded (`passed`/`failed`) application.
 */
export async function completeAdvancedInterview(
  rawApplicationId: string,
  rawConversationId: string | null
): Promise<void> {
  const applicationId = idSchema.parse(rawApplicationId);
  const conversationId = conversationIdSchema.parse(rawConversationId);

  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const profile = await prisma.candidateProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!profile) throw new Error("No candidate profile");

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    select: { id: true, candidateProfileId: true },
  });
  // Ownership check — never let a candidate stamp another candidate's interview.
  if (!application || application.candidateProfileId !== profile.id) {
    throw new Error("Application not found");
  }

  // Atomic conditional update: status guard + write happen in one statement,
  // so a concurrent/duplicate call simply no-ops (updateMany matches 0 rows).
  const updated = await prisma.application.updateMany({
    where: {
      id: applicationId,
      candidateProfileId: profile.id,
      status: { in: ["submitted", "draft"] },
    },
    data: {
      status: "interview_completed",
      voiceConversationId: conversationId,
    },
  });

  // Phase 3.4 — completion-triggered grading (the advanced counterpart of the
  // Python worker grading regardless of the browser tab): kick it off detached
  // so the candidate's redirect to the result page isn't blocked. It runs on
  // the persistent Node/PM2 server; if the server restarts and loses it, the
  // result page's poll (ensureAdvancedGraded) re-triggers it. Only fired when
  // this call actually did the stamping (count > 0) — duplicate calls no-op.
  if (updated.count > 0) {
    void gradeAdvancedInterview(applicationId).catch((error) =>
      console.error("[advanced-grading] Detached grading task failed:", error)
    );
  }
}
