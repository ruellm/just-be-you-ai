"use server";

import { randomUUID } from "crypto";
import { z } from "zod";
import {
  AccessToken,
  AgentDispatchClient,
  RoomServiceClient,
} from "livekit-server-sdk";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// Phase 2.2d — mint a candidate token + dispatch the Python voice agent into a
// fresh room so the browser can run the REAL interview.
//
// The Python worker (voice-agent/agent.py) registers under this exact
// agent_name; both sides MUST agree on it. The agent reads the interview's
// application_id from the ROOM metadata (not participant/dispatch metadata) —
// see _parse_application_id in agent.py — so we set it on the room below.
const AGENT_NAME = "just-be-you-interviewer";

const idSchema = z.string().min(1);

export type InterviewConnection = {
  token: string;
  url: string;
  roomName: string;
};

// Statuses from which a live interview is still allowed. Anything past this
// (interview_completed/passed/failed/archived) means it was already taken.
function isInterviewable(status: string): boolean {
  return status === "submitted" || status === "draft";
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

/**
 * Start (or restart) a real voice interview for an application.
 *
 * Returns the connection details the browser needs to join the LiveKit room,
 * or `null` if the application has already been interviewed (the caller should
 * redirect to the result page in that case).
 *
 * Throws on auth/ownership failure or LiveKit misconfiguration.
 */
export async function startInterviewSession(
  rawApplicationId: string
): Promise<InterviewConnection | null> {
  const applicationId = idSchema.parse(rawApplicationId);

  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const profile = await prisma.candidateProfile.findUnique({
    where: { userId: user.id },
    select: { id: true, firstName: true },
  });
  if (!profile) throw new Error("No candidate profile");

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    select: { id: true, candidateProfileId: true, status: true },
  });
  // Ownership check — never let a candidate join another candidate's interview.
  if (!application || application.candidateProfileId !== profile.id) {
    throw new Error("Application not found");
  }
  // Already interviewed → tell the caller to go to the result page.
  if (!isInterviewable(application.status)) {
    return null;
  }

  const apiKey = requireEnv("LIVEKIT_API_KEY");
  const apiSecret = requireEnv("LIVEKIT_API_SECRET");
  const url = requireEnv("LIVEKIT_URL");
  // The server-side clients speak HTTP(S); the browser uses the wss:// URL.
  const httpUrl = url.replace(/^ws/, "http");

  // A short random suffix keeps re-takes from colliding with a stale room.
  const roomName = `interview-${applicationId}-${randomUUID().slice(0, 8)}`;
  const roomMetadata = JSON.stringify({ application_id: applicationId });

  // 1. Create the room up front and stamp the application_id onto its metadata.
  //    The Python agent reads this on join to load the right context.
  const roomService = new RoomServiceClient(httpUrl, apiKey, apiSecret);
  await roomService.createRoom({
    name: roomName,
    metadata: roomMetadata,
    // Tear the room down shortly after everyone leaves so it can't linger.
    emptyTimeout: 60,
    departureTimeout: 20,
  });

  // 2. Explicitly dispatch our named agent into the room (named dispatch — the
  //    worker has no automatic dispatch, so it only joins rooms we ask it to).
  const dispatchClient = new AgentDispatchClient(httpUrl, apiKey, apiSecret);
  await dispatchClient.createDispatch(roomName, AGENT_NAME, {
    metadata: roomMetadata,
  });

  // 3. Mint the candidate's join token.
  const candidateName =
    profile.firstName?.trim() || user.email?.trim() || "Candidate";
  const at = new AccessToken(apiKey, apiSecret, {
    identity: user.id,
    name: candidateName,
    metadata: roomMetadata,
    ttl: "1h", // comfortably longer than the 20-min interview cap
  });
  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
  });
  const token = await at.toJwt();

  return { token, url, roomName };
}
