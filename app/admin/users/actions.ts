"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUserRole } from "@/lib/auth";
import { MAX_SEATS_TOTAL } from "@/lib/admin";
import { countInterviewSeatsUsed } from "@/lib/interview-seats";
import type { SetSeatsResult } from "@/app/admin/companies/actions";

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

const seatsSchema = z.number().int().min(0).max(MAX_SEATS_TOTAL);

export async function setCandidateSeats(
  candidateProfileId: string,
  seats: number
): Promise<SetSeatsResult> {
  if ((await getCurrentUserRole()) !== "admin") {
    return { ok: false, reason: "error", error: "Not authorized." };
  }

  const idParsed = z.string().min(1).safeParse(candidateProfileId);
  const seatsParsed = seatsSchema.safeParse(seats);
  if (!idParsed.success || !seatsParsed.success) {
    return { ok: false, reason: "error", error: "Invalid request." };
  }

  const result = await prisma.$transaction(async (tx) => {
    const profile = await tx.candidateProfile.findUnique({
      where: { id: idParsed.data },
      select: { id: true, userId: true },
    });
    if (!profile) {
      return { ok: false as const, reason: "error" as const, error: "Candidate not found." };
    }
    const seatsUsed = await countInterviewSeatsUsed(tx, profile.id);
    if (seatsParsed.data < seatsUsed) {
      return {
        ok: false as const,
        reason: "below_used" as const,
        seatsUsed,
        requested: seatsParsed.data,
      };
    }
    await tx.candidateProfile.update({
      where: { id: profile.id },
      data: { interviewSeatsTotal: seatsParsed.data },
    });
    return {
      ok: true as const,
      seatsUsed,
      seatsTotal: seatsParsed.data,
      userId: profile.userId,
    };
  });

  if (result.ok) {
    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${result.userId}`);
    return { ok: true, seatsUsed: result.seatsUsed, seatsTotal: result.seatsTotal };
  }
  return result;
}
