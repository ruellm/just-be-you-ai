"use server";

import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { generateQuestionsForApplication } from "@/lib/ai/generate-questions";

export type StartPrescreenResult = { ok: false; message: string };

// Start (or resume) the candidate's one pre-screening interview: an
// Application with kind = prescreen and no job. A completed pre-screen cannot
// be retaken. One that was started but never finished is reused as the same
// row with a fresh interview session, so a candidate never gets two.
// No seat is spent and no match is computed; questions come from the resume
// and the Preferred Role, through the same generator jobs use.
export async function startPrescreen(): Promise<StartPrescreenResult> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const profile = await prisma.candidateProfile.findUnique({
    where: { userId: user.id },
    select: {
      id: true,
      resumeUrl: true,
      parsedResumeText: true,
      cleanedResumeText: true,
      resumeFlagsJson: true,
    },
  });
  if (!profile) redirect("/candidate/profile");

  if (!profile.parsedResumeText?.trim()) {
    return {
      ok: false,
      message: profile.resumeUrl
        ? "We couldn't read your resume. Please upload it again before starting."
        : "Upload your resume before starting the pre-screening interview.",
    };
  }

  const existing = await prisma.application.findFirst({
    where: { candidateProfileId: profile.id, kind: "prescreen" },
    select: {
      id: true,
      status: true,
      interviewResult: { select: { id: true } },
    },
  });
  const completed =
    existing != null &&
    (existing.interviewResult != null ||
      (existing.status !== "submitted" && existing.status !== "draft"));
  if (completed) {
    return {
      ok: false,
      message: "You have already completed your pre-screening interview.",
    };
  }

  // Same resume snapshot an application to a job takes at apply time.
  const snapshot = {
    status: "submitted" as const,
    voiceConversationId: null,
    resumeSnapshotAt: new Date(),
    appliedParsedResumeText: profile.parsedResumeText,
    appliedCleanedResumeText: profile.cleanedResumeText,
    appliedResumeFlagsJson:
      profile.resumeFlagsJson === null
        ? Prisma.DbNull
        : (profile.resumeFlagsJson as Prisma.InputJsonValue),
  };

  let applicationId: string;
  if (existing) {
    await prisma.application.update({
      where: { id: existing.id },
      data: snapshot,
    });
    applicationId = existing.id;
  } else {
    try {
      const created = await prisma.application.create({
        data: { candidateProfileId: profile.id, kind: "prescreen", ...snapshot },
        select: { id: true },
      });
      applicationId = created.id;
    } catch (error) {
      // Two quick clicks: the partial unique index let only one row through.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const row = await prisma.application.findFirst({
          where: { candidateProfileId: profile.id, kind: "prescreen" },
          select: { id: true },
        });
        if (!row) throw error;
        applicationId = row.id;
      } else {
        throw error;
      }
    }
  }

  // Detached, like Apply: the Setup page does not wait for it, and the
  // interview prompt falls back to its built-in pool if it is not done yet.
  // A reused row gets its questions regenerated from the current resume.
  void generateQuestionsForApplication(applicationId, {
    overwrite: existing != null,
  }).catch((error) => {
    console.error(
      `[generate-questions] Failed for pre-screen ${applicationId}:`,
      error
    );
  });

  redirect(`/candidate/applications/${applicationId}/interview`);
}
