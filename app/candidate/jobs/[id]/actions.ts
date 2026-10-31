"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { applicationPath } from "@/lib/applications";
import {
  OUT_OF_SEATS_MESSAGE,
  getInterviewSeatBalance,
} from "@/lib/interview-seats";
import { generateQuestionsForApplication } from "@/lib/ai/generate-questions";
import { computeApplicationMatch } from "@/lib/match/compute-match";

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
    select: { id: true, status: true, company: { select: { hiddenAt: true } } },
  });
  if (!job) redirect("/candidate/jobs");
  // Same rule as visibleJobWhere, checked here so the candidate gets a
  // message instead of a silent redirect.
  if (job.company.hiddenAt) {
    return {
      ok: false,
      reason: "error",
      message: "This job is no longer available.",
    };
  }
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
        const balance = await getInterviewSeatBalance(tx, profile.id);
        if (balance.remaining === 0) {
          return {
            kind: "no_seats" as const,
            used: balance.used,
            total: balance.total,
          };
        }
        // Resume snapshot: read the profile's resume fields and write them onto
        // the application in this same transaction, so an application can
        // never exist without its snapshot and a concurrent re-upload cannot
        // slip in between. Question generation and grading read these, not
        // the live profile (see lib/ai/resume-snapshot.ts).
        const resume = await tx.candidateProfile.findUniqueOrThrow({
          where: { id: profile.id },
          select: {
            parsedResumeText: true,
            cleanedResumeText: true,
            resumeFlagsJson: true,
          },
        });
        const created = await tx.application.create({
          data: {
            candidateProfileId: profile.id,
            jobId,
            status: "submitted",
            resumeSnapshotAt: new Date(),
            appliedParsedResumeText: resume.parsedResumeText,
            appliedCleanedResumeText: resume.cleanedResumeText,
            appliedResumeFlagsJson:
              resume.resumeFlagsJson === null
                ? Prisma.DbNull
                : (resume.resumeFlagsJson as Prisma.InputJsonValue),
          },
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

  // Resume-vs-job match runs the same way: detached, skipped if already set,
  // and a failure only leaves the match columns null.
  void computeApplicationMatch(application.id).catch((error) => {
    console.error(
      `[compute-match] Failed for application ${application.id}:`,
      error
    );
  });

  redirect(`/candidate/applications/${application.id}/interview`);
}
