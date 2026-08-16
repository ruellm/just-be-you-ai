"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { applicationPath } from "@/lib/applications";
import {
  OUT_OF_SEATS_MESSAGE,
  countInterviewSeatsUsed,
} from "@/lib/interview-seats";
import { generateQuestionsForApplication } from "@/lib/ai/generate-questions";

const idSchema = z.string().min(1);

export type ApplyResult =
  | { ok: false; reason: "no_seats"; message: string; used: number; total: number }
  | { ok: false; reason: "error"; message: string };

// Apply to a job: create a `submitted` Application, or redirect to the existing
// one (no duplicates — enforced by the @@unique([candidateProfileId, jobId])).
export async function applyToJob(rawJobId: string): Promise<ApplyResult> {
  const parsed = idSchema.safeParse(rawJobId);
  if (!parsed.success) redirect("/candidate/jobs");
  const jobId = parsed.data;

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const profile = await prisma.candidateProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!profile) redirect("/candidate/profile");

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: { id: true, status: true },
  });
  if (!job) redirect("/candidate/jobs");
  if (job.status === "closed") redirect(`/candidate/jobs/${jobId}`);

  const existing = await prisma.application.findUnique({
    where: {
      candidateProfileId_jobId: { candidateProfileId: profile.id, jobId },
    },
    select: { id: true, status: true },
  });
  if (existing) {
    redirect(applicationPath(existing.id, existing.status));
  }

  let outcome:
    | { kind: "created"; id: string }
    | { kind: "no_seats"; used: number; total: number };
  try {
    outcome = await prisma.$transaction(
      async (tx) => {
        const [used, seatProfile] = await Promise.all([
          countInterviewSeatsUsed(tx, profile.id),
          tx.candidateProfile.findUniqueOrThrow({
            where: { id: profile.id },
            select: { interviewSeatsTotal: true },
          }),
        ]);
        if (used >= seatProfile.interviewSeatsTotal) {
          return {
            kind: "no_seats" as const,
            used,
            total: seatProfile.interviewSeatsTotal,
          };
        }
        const created = await tx.application.create({
          data: { candidateProfileId: profile.id, jobId, status: "submitted" },
          select: { id: true },
        });
        return { kind: "created" as const, id: created.id };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        const dup = await prisma.application.findUnique({
          where: {
            candidateProfileId_jobId: { candidateProfileId: profile.id, jobId },
          },
          select: { id: true, status: true },
        });
        if (dup) redirect(applicationPath(dup.id, dup.status));
      }
      if (error.code === "P2034") {
        return {
          ok: false,
          reason: "error",
          message: "Could not apply. Please try again.",
        };
      }
    }
    throw error;
  }

  if (outcome.kind === "no_seats") {
    return {
      ok: false,
      reason: "no_seats",
      message: OUT_OF_SEATS_MESSAGE,
      used: outcome.used,
      total: outcome.total,
    };
  }
  const application = { id: outcome.id };

  // Question generation (3–8s) is fired as a detached background task — the
  // candidate redirects to the interview page immediately and the persistent
  // Node server finishes generation behind the scenes. Both prompt builders
  // read questions live at interview start and fall back to their built-in
  // question-pool guidance if generation hasn't finished (rare), so nothing
  // blocks on it. The function itself no-ops if questions already exist, so a
  // double-fire can't burn a second Claude call. (Resume cleanup no longer runs
  // here — it happens once at resume upload; see profile/resume/actions.ts.)
  void generateQuestionsForApplication(application.id).catch((error) => {
    console.error(
      `[generate-questions] Failed for application ${application.id}:`,
      error
    );
  });

  redirect(`/candidate/applications/${application.id}/interview`);
}
