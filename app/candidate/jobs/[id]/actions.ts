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

  // Generate the AI interview questions up front (3–8s). Never block the
  // candidate: on failure we log and continue — an admin can regenerate later.
  try {
    await generateQuestionsForApplication(application.id);
  } catch (error) {
    console.error(
      `[generate-questions] Failed for application ${application.id}:`,
      error
    );
  }

  redirect(`/candidate/applications/${application.id}/interview`);
}
