"use server";

import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  partObjectPath,
  RECORDING_MIME_TYPES,
  RECORDINGS_BUCKET,
  RETENTION_DAYS,
} from "@/lib/recording/storage";

// Server side of the interview video recording. The browser records the
// candidate's camera + mic in 10s parts and uploads each one through a signed
// upload URL issued here, so the service-role key never leaves the server.
// Every call checks that the signed-in candidate owns the application.

// A part number may run ahead of the highest issued one by at most this much.
const PART_WINDOW = 5;

const idSchema = z.string().min(1);
const mimeTypeSchema = z.enum(RECORDING_MIME_TYPES);

async function requireOwnedApplication(applicationId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  const application = await prisma.application.findFirst({
    where: { id: applicationId, candidateProfile: { userId: user.id } },
    select: { id: true },
  });
  if (!application) throw new Error("Application not found");
  return application;
}

async function requireOwnedActiveRecording(recordingId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  const recording = await prisma.interviewRecording.findFirst({
    where: {
      id: recordingId,
      application: { candidateProfile: { userId: user.id } },
    },
    select: {
      id: true,
      status: true,
      mimeType: true,
      partCount: true,
      storagePrefix: true,
    },
  });
  if (!recording) throw new Error("Recording not found");
  if (recording.status !== "recording") {
    throw new Error("Recording is no longer accepting parts");
  }
  return recording;
}

export type RecordingSession = {
  recordingId: string;
  storagePrefix: string;
};

// Creates the recording row. consentAt is when the candidate pressed
// "Agree & Start Interview"; the mimeType was chosen by the browser.
export async function startRecording(
  rawApplicationId: string,
  rawConsentAt: string,
  rawMimeType: string
): Promise<RecordingSession> {
  const applicationId = idSchema.parse(rawApplicationId);
  const consentAt = z.coerce.date().parse(rawConsentAt);
  const mimeType = mimeTypeSchema.parse(rawMimeType);
  const application = await requireOwnedApplication(applicationId);

  const id = randomUUID();
  const startedAt = new Date();
  const deleteAfter = new Date(
    startedAt.getTime() + RETENTION_DAYS * 24 * 60 * 60 * 1000
  );
  const storagePrefix = `${application.id}/${id}`;

  await prisma.interviewRecording.create({
    data: {
      id,
      applicationId: application.id,
      consentAt,
      startedAt,
      mimeType,
      storagePrefix,
      deleteAfter,
    },
  });

  return { recordingId: id, storagePrefix };
}

export type PartUploadTarget = {
  path: string;
  token: string;
};

// Signed upload URL for exactly one part object. Rejected once the recording
// is finalized, and for part numbers far ahead of what has been issued.
export async function getPartUploadUrl(
  rawRecordingId: string,
  rawPartNumber: number
): Promise<PartUploadTarget> {
  const recordingId = idSchema.parse(rawRecordingId);
  const partNumber = z.number().int().min(1).parse(rawPartNumber);
  const recording = await requireOwnedActiveRecording(recordingId);

  if (partNumber > recording.partCount + PART_WINDOW) {
    throw new Error(`Part ${partNumber} is out of order`);
  }
  if (partNumber > recording.partCount) {
    await prisma.interviewRecording.update({
      where: { id: recording.id },
      data: { partCount: partNumber },
    });
  }

  const path = partObjectPath(recording.storagePrefix, partNumber, recording.mimeType);
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(RECORDINGS_BUCKET)
    .createSignedUploadUrl(path, { upsert: true });
  if (error || !data) {
    throw new Error(`Could not sign upload for ${path}: ${error?.message ?? "no data"}`);
  }
  return { path: data.path, token: data.token };
}

export type RecordingOutcome = "complete" | "incomplete";

// Closes the recording. partCount / totalBytes are what the browser actually
// uploaded. `incomplete` is used when the recorder lost its tracks or the
// page was left before a normal end.
export async function finalizeRecording(
  rawRecordingId: string,
  rawPartCount: number,
  rawTotalBytes: number,
  rawOutcome: RecordingOutcome = "complete"
): Promise<void> {
  const recordingId = idSchema.parse(rawRecordingId);
  const partCount = z.number().int().min(0).parse(rawPartCount);
  const totalBytes = z.number().int().min(0).parse(rawTotalBytes);
  const outcome = z.enum(["complete", "incomplete"]).parse(rawOutcome);
  const recording = await requireOwnedActiveRecording(recordingId);

  await prisma.interviewRecording.update({
    where: { id: recording.id },
    data: {
      endedAt: new Date(),
      partCount,
      totalBytes: BigInt(totalBytes),
      status: outcome,
    },
  });
}
