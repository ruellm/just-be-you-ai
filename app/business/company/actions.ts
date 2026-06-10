"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { fieldErrorsFrom } from "@/lib/zod";
import { companySchema, type ActionResult, type CompanyValues } from "./schemas";

function nullify(value: string): string | null {
  return value.trim() === "" ? null : value.trim();
}

export async function saveCompany(values: CompanyValues): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "You are not signed in." };

  const parsed = companySchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const d = parsed.data;

  try {
    await prisma.company.upsert({
      where: { userId: user.id },
      update: {
        name: d.name,
        description: nullify(d.description),
        website: nullify(d.website),
        logoUrl: nullify(d.logoUrl),
      },
      create: {
        userId: user.id,
        name: d.name,
        description: nullify(d.description),
        website: nullify(d.website),
        logoUrl: nullify(d.logoUrl),
      },
    });
  } catch {
    return { success: false, error: "Could not save. Please try again." };
  }

  revalidatePath("/business/company");
  revalidatePath("/business/dashboard");
  return { success: true };
}
