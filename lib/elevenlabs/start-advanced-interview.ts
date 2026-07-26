"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { buildInterviewSystemPrompt } from "@/lib/ai/build-interview-prompt";

// Phase 3.3 — the ADVANCED (ElevenLabs) counterpart of
// lib/livekit/start-interview.ts#startInterviewSession. Unlike the LiveKit
// path, the SESSION itself is started by the BROWSER (@elevenlabs/client);
// this action only gate-keeps (auth + ownership + status) and hands the
// client what it needs: the agent id and the per-application system prompt
// (delivered as a prompt override so the shared ElevenLabs agent interviews
// for THIS job/candidate).

const idSchema = z.string().min(1);

export type AdvancedInterviewSetup = {
  agentId: string;
  systemPrompt: string;
};

// Statuses from which a live interview is still allowed. Anything past this
// (interview_completed/passed/failed/archived) means it was already taken.
// Mirrors isInterviewable in lib/livekit/start-interview.ts.
function isInterviewable(status: string): boolean {
  return status === "submitted" || status === "draft";
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

/**
 * Prepare an advanced (ElevenLabs) voice interview for an application.
 *
 * Returns the agent id + system prompt the browser needs to start the
 * ElevenLabs session, or `null` if the application has already been
 * interviewed (the caller should redirect to the result page in that case).
 *
 * Throws on auth/ownership failure or missing configuration.
 */
export async function startAdvancedInterview(
  rawApplicationId: string
): Promise<AdvancedInterviewSetup | null> {
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
    select: { id: true, candidateProfileId: true, status: true },
  });
  // Ownership check — never let a candidate take another candidate's interview.
  if (!application || application.candidateProfileId !== profile.id) {
    throw new Error("Application not found");
  }
  // Already interviewed → tell the caller to go to the result page.
  if (!isInterviewable(application.status)) {
    return null;
  }

  // NEXT_PUBLIC_ so the agent id is not a secret (it's visible client-side by
  // design); the server reads it too so the client gets both values in one call.
  const agentId = requireEnv("NEXT_PUBLIC_ELEVENLABS_AGENT_ID");
  const systemPrompt = await buildInterviewSystemPrompt(applicationId);

  return { agentId, systemPrompt };
}
