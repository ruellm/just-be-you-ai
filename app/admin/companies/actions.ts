"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUserRole } from "@/lib/auth";
import { MAX_SEATS_TOTAL } from "@/lib/admin";
import { countProfileUnlocks, seatsRemaining } from "@/lib/interview-seats";

export type SeatsInput = { total: number; used: number };

export type SetSeatsResult =
  | { ok: true; seatsUsed: number; seatsTotal: number; seatsRemaining: number }
  | { ok: false; reason: "below_used"; seatsUsed: number; requested: number }
  | { ok: false; reason: "error"; error: string };

const seatsInputSchema = z.object({
  total: z.number().int().min(0).max(MAX_SEATS_TOTAL),
  used: z.number().int().min(0).max(MAX_SEATS_TOTAL),
});

export async function setCompanySeats(
  companyId: string,
  input: SeatsInput
): Promise<SetSeatsResult> {
  if ((await getCurrentUserRole()) !== "admin") {
    return { ok: false, reason: "error", error: "Not authorized." };
  }

  const idParsed = z.string().min(1).safeParse(companyId);
  const seatsParsed = seatsInputSchema.safeParse(input);
  if (!idParsed.success || !seatsParsed.success) {
    return { ok: false, reason: "error", error: "Invalid request." };
  }
  const { total, used } = seatsParsed.data;

  const result = await prisma.$transaction(async (tx) => {
    const company = await tx.company.findUnique({
      where: { id: idParsed.data },
      select: { id: true, userId: true },
    });
    if (!company) {
      return { ok: false as const, reason: "error" as const, error: "Company not found." };
    }
    if (total < used) {
      return {
        ok: false as const,
        reason: "below_used" as const,
        seatsUsed: used,
        requested: total,
      };
    }
    const trueUsed = await countProfileUnlocks(tx, company.id);
    await tx.company.update({
      where: { id: company.id },
      data: { seatsTotal: total, seatsAdjustment: used - trueUsed },
    });
    return {
      ok: true as const,
      seatsUsed: used,
      seatsTotal: total,
      seatsRemaining: seatsRemaining(used, total),
      userId: company.userId,
    };
  });

  if (result.ok) {
    revalidatePath("/admin/companies");
    revalidatePath(`/admin/companies/${idParsed.data}`);
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
