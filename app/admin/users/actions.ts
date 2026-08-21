"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUserRole } from "@/lib/auth";
import { MAX_SEATS_TOTAL } from "@/lib/admin";
import { countInterviewSeatsUsed, seatsRemaining } from "@/lib/interview-seats";
import type { SeatsInput, SetSeatsResult } from "@/app/admin/companies/actions";

const roleSchema = z.enum(["candidate", "business", "admin"]);

type Result = { success: true } | { success: false; error?: string };

export async function changeUserRole(
  userId: string,
  role: string
): Promise<Result> {
  if ((await getCurrentUserRole()) !== "admin") {
    return { success: false, error: "Not authorized." };
  }

  const idParsed = z.string().min(1).safeParse(userId);
  const roleParsed = roleSchema.safeParse(role);
  if (!idParsed.success || !roleParsed.success) {
    return { success: false, error: "Invalid request." };
  }

  await prisma.user.update({
    where: { id: idParsed.data },
    data: { role: roleParsed.data },
  });

  // Keep the role-specific record consistent so the user's section works.
  if (roleParsed.data === "business") {
    await prisma.company.upsert({
      where: { userId: idParsed.data },
      update: {},
      create: { userId: idParsed.data, name: "" },
    });
  } else if (roleParsed.data === "candidate") {
    await prisma.candidateProfile.upsert({
      where: { userId: idParsed.data },
      update: {},
      create: { userId: idParsed.data },
    });
  }

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${idParsed.data}`);
  return { success: true };
}

const seatsInputSchema = z.object({
  total: z.number().int().min(0).max(MAX_SEATS_TOTAL),
  used: z.number().int().min(0).max(MAX_SEATS_TOTAL),
});

export async function setCandidateSeats(
  candidateProfileId: string,
  input: SeatsInput
): Promise<SetSeatsResult> {
  if ((await getCurrentUserRole()) !== "admin") {
    return { ok: false, reason: "error", error: "Not authorized." };
  }

  const idParsed = z.string().min(1).safeParse(candidateProfileId);
  const seatsParsed = seatsInputSchema.safeParse(input);
  if (!idParsed.success || !seatsParsed.success) {
    return { ok: false, reason: "error", error: "Invalid request." };
  }
  const { total, used } = seatsParsed.data;

  const result = await prisma.$transaction(async (tx) => {
    const profile = await tx.candidateProfile.findUnique({
      where: { id: idParsed.data },
      select: { id: true, userId: true },
    });
    if (!profile) {
      return { ok: false as const, reason: "error" as const, error: "Candidate not found." };
    }
    if (total < used) {
      return {
        ok: false as const,
        reason: "below_used" as const,
        seatsUsed: used,
        requested: total,
      };
    }
    const trueUsed = await countInterviewSeatsUsed(tx, profile.id);
    await tx.candidateProfile.update({
      where: { id: profile.id },
      data: { interviewSeatsTotal: total, interviewSeatsAdjustment: used - trueUsed },
    });
    return {
      ok: true as const,
      seatsUsed: used,
      seatsTotal: total,
      seatsRemaining: seatsRemaining(used, total),
      userId: profile.userId,
    };
  });

  if (result.ok) {
    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${result.userId}`);
    return {
      ok: true,
      seatsUsed: result.seatsUsed,
      seatsTotal: result.seatsTotal,
      seatsRemaining: result.seatsRemaining,
    };
  }
  return result;
}
