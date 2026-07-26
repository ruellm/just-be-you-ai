"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { applicationPath } from "@/lib/applications";
import { generateQuestionsForApplication } from "@/lib/ai/generate-questions";

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
    select: { id: true },
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
