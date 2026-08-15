"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { LEVEL_RANK } from "@/lib/applications";
import { buildTranscript, randomScore, randomTier } from "@/lib/mock-interview";

const idSchema = z.string().min(1);

// Finish the (mocked) interview: generate a fake InterviewResult, then set the
// application to passed/failed using the tier >= job.level rule.
export async function finishInterview(rawApplicationId: string) {
  const parsed = idSchema.safeParse(rawApplicationId);
  if (!parsed.success) redirect("/candidate/applications");
  const applicationId = parsed.data;

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const profile = await prisma.candidateProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!profile) redirect("/candidate/profile");

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    select: {
      id: true,
      candidateProfileId: true,
      status: true,
      job: { select: { level: true } },
    },
  });

  // Ownership check.
  if (!application || application.candidateProfileId !== profile.id) {
    redirect("/candidate/applications");
  }

  // Already interviewed → go straight to the result.
  if (application.status !== "submitted" && application.status !== "draft") {
    redirect(`/candidate/applications/${applicationId}/result`);
  }

  const tier = randomTier();
  const score = randomScore();
  const transcript = buildTranscript();
  // Pass rule: interview tier rank >= required job level rank.
  const passed = LEVEL_RANK[tier] >= LEVEL_RANK[application.job.level];

  try {
    await prisma.$transaction([
      prisma.interviewResult.create({
        data: { applicationId, score, tier, transcript },
      }),
      prisma.application.update({
        where: { id: applicationId },
        data: { status: passed ? "passed" : "failed" },
      }),
    ]);
  } catch {
    // Likely a double-submit (InterviewResult.applicationId is unique) — the
    // first call already produced the result; just fall through to the result.
  }

  redirect(`/candidate/applications/${applicationId}/result`);
}
