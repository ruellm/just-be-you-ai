"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { applicationPath } from "@/lib/applications";
import { generateQuestionsForApplication } from "@/lib/ai/generate-questions";
import { cleanResumeText } from "@/lib/ai/clean-resume";

const idSchema = z.string().min(1);

// Apply to a job: create a `submitted` Application, or redirect to the existing
// one (no duplicates — enforced by the @@unique([candidateProfileId, jobId])).
export async function applyToJob(rawJobId: string) {
  const parsed = idSchema.safeParse(rawJobId);
  if (!parsed.success) redirect("/candidate/jobs");
  const jobId = parsed.data;

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const profile = await prisma.candidateProfile.findUnique({
    where: { userId: user.id },
    select: {
      id: true,
      parsedResumeText: true,
      firstName: true,
      lastName: true,
    },
  });
  if (!profile) redirect("/candidate/profile/basic-info");

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

  const application = await prisma.application.create({
    data: { candidateProfileId: profile.id, jobId, status: "submitted" },
    select: { id: true },
  });

  // Two independent AI prep steps, run in parallel so the candidate only waits
  // for the slower one. Neither may block Apply — each logs and continues on
  // failure, and neither depends on the other:
  //   1. Resume cleanup (Phase 2.4): strip PII/references from the parsed
  //      resume → cleanedResumeText. Interview prompt builders fall back to
  //      the raw parsedResumeText when this is missing, so a failure here
  //      only means the raw text is used.
  //   2. Question generation (3–8s) — an admin can regenerate later. It reads
  //      the raw parsedResumeText, deliberately NOT the cleaned text.
  await Promise.all([
    (async () => {
      if (!profile.parsedResumeText) return;
      try {
        // Name anchors "who the candidate is" so third-party people are
        // stripped; null when the profile has no name yet.
        const candidateName =
          [profile.firstName, profile.lastName].filter(Boolean).join(" ") ||
          null;
        // cleanResumeText fails open (returns the raw text) — the try/catch
        // here only guards the DB write.
        const cleaned = await cleanResumeText(
          profile.parsedResumeText,
          candidateName
        );
        await prisma.candidateProfile.update({
          where: { id: profile.id },
          data: { cleanedResumeText: cleaned },
        });
      } catch (error) {
        console.error(
          `[clean-resume] Failed for application ${application.id}:`,
          error
        );
      }
    })(),
    (async () => {
      try {
        await generateQuestionsForApplication(application.id);
      } catch (error) {
        console.error(
          `[generate-questions] Failed for application ${application.id}:`,
          error
        );
      }
    })(),
  ]);

  redirect(`/candidate/applications/${application.id}/interview`);
}
