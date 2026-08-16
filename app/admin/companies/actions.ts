"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUserRole } from "@/lib/auth";
import { MAX_SEATS_TOTAL } from "@/lib/admin";

export type SetSeatsResult =
  | { ok: true; seatsUsed: number; seatsTotal: number }
  | { ok: false; reason: "below_used"; seatsUsed: number; requested: number }
  | { ok: false; reason: "error"; error: string };

const seatsSchema = z.number().int().min(0).max(MAX_SEATS_TOTAL);

export async function setCompanySeats(
  companyId: string,
  seats: number
): Promise<SetSeatsResult> {
  if ((await getCurrentUserRole()) !== "admin") {
    return { ok: false, reason: "error", error: "Not authorized." };
  }

  const idParsed = z.string().min(1).safeParse(companyId);
  const seatsParsed = seatsSchema.safeParse(seats);
  if (!idParsed.success || !seatsParsed.success) {
    return { ok: false, reason: "error", error: "Invalid request." };
  }

  const result = await prisma.$transaction(async (tx) => {
    const company = await tx.company.findUnique({
      where: { id: idParsed.data },
      select: { id: true, userId: true },
    });
    if (!company) {
      return { ok: false as const, reason: "error" as const, error: "Company not found." };
    }
    const seatsUsed = await tx.profileUnlock.count({
      where: { companyId: company.id },
    });
    if (seatsParsed.data < seatsUsed) {
      return {
        ok: false as const,
        reason: "below_used" as const,
        seatsUsed,
        requested: seatsParsed.data,
      };
    }
    await tx.company.update({
      where: { id: company.id },
      data: { seatsTotal: seatsParsed.data },
    });
    return {
      ok: true as const,
      seatsUsed,
      seatsTotal: seatsParsed.data,
      userId: company.userId,
    };
  });

  if (result.ok) {
    revalidatePath("/admin/companies");
    revalidatePath(`/admin/companies/${idParsed.data}`);
    revalidatePath(`/admin/users/${result.userId}`);
    return { ok: true, seatsUsed: result.seatsUsed, seatsTotal: result.seatsTotal };
  }
  return result;
}
