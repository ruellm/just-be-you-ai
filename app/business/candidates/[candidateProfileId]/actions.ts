"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { candidateAppliedToCompany, getCurrentCompany } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

// Signed URL for a candidate's resume — only if that candidate applied to one
// of the current company's jobs.
export async function getCandidateResumeSignedUrl(
  candidateProfileId: string
): Promise<{ url: string } | { error: string }> {
  const parsed = z.string().min(1).safeParse(candidateProfileId);
  if (!parsed.success) return { error: "Invalid request." };

  const company = await getCurrentCompany();
  if (!company) return { error: "You are not signed in." };

  const allowed = await candidateAppliedToCompany(company.id, parsed.data);
  if (!allowed) return { error: "Not authorized." };

  const profile = await prisma.candidateProfile.findUnique({
    where: { id: parsed.data },
    select: { resumeUrl: true },
  });
  if (!profile?.resumeUrl) return { error: "No resume on file." };

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from("resumes")
    .createSignedUrl(profile.resumeUrl, 60);
  if (error || !data) return { error: "Could not generate link." };

  return { url: data.signedUrl };
}
