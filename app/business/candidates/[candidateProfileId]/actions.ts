"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { candidateAppliedToCompany, getCurrentCompany } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export type UnlockResult =
  | { ok: true; seatsUsed: number; seatsTotal: number }
  | { ok: false; reason: "insufficient_seats"; seatsUsed: number; seatsTotal: number }
  | { ok: false; reason: "error"; error: string };

export async function unlockCandidateProfile(
  candidateProfileId: string
): Promise<UnlockResult> {
  const parsed = z.string().min(1).safeParse(candidateProfileId);
  if (!parsed.success) return { ok: false, reason: "error", error: "Invalid request." };

  const company = await getCurrentCompany();
  if (!company) return { ok: false, reason: "error", error: "You are not signed in." };

  const allowed = await candidateAppliedToCompany(company.id, parsed.data);
  if (!allowed) return { ok: false, reason: "error", error: "Not authorized." };

  const result = await prisma.$transaction(async (tx) => {
    const seatsUsed = await tx.profileUnlock.count({
      where: { companyId: company.id },
    });
    const existing = await tx.profileUnlock.findUnique({
      where: {
        companyId_candidateProfileId: {
          companyId: company.id,
          candidateProfileId: parsed.data,
        },
      },
      select: { id: true },
    });
    if (existing) return { ok: true as const, seatsUsed, seatsTotal: company.seatsTotal };
    if (seatsUsed >= company.seatsTotal) {
      return {
        ok: false as const,
        reason: "insufficient_seats" as const,
        seatsUsed,
        seatsTotal: company.seatsTotal,
      };
    }
    try {
      await tx.profileUnlock.create({
        data: { companyId: company.id, candidateProfileId: parsed.data },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      ) {
        return { ok: true as const, seatsUsed, seatsTotal: company.seatsTotal };
      }
      throw e;
    }
    return {
      ok: true as const,
      seatsUsed: seatsUsed + 1,
      seatsTotal: company.seatsTotal,
    };
  });

  revalidatePath(`/business/candidates/${parsed.data}`);
  return result;
}

export async function getCandidateResumeSignedUrl(
  candidateProfileId: string
): Promise<{ url: string } | { error: string }> {
  const parsed = z.string().min(1).safeParse(candidateProfileId);
  if (!parsed.success) return { error: "Invalid request." };

  const company = await getCurrentCompany();
  if (!company) return { error: "You are not signed in." };

  const allowed = await candidateAppliedToCompany(company.id, parsed.data);
  if (!allowed) return { error: "Not authorized." };

  const unlock = await prisma.profileUnlock.findUnique({
    where: {
      companyId_candidateProfileId: {
        companyId: company.id,
        candidateProfileId: parsed.data,
      },
    },
    select: { id: true },
  });
  if (!unlock) return { error: "Unlock this profile to view the resume." };

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
