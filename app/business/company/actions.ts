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
  const data = {
    name: d.name,
    description: nullify(d.description),
    website: nullify(d.website),
    logoUrl: nullify(d.logoUrl),
    yearFounded: d.yearFounded === "" ? null : Number.parseInt(d.yearFounded, 10),
    contactEmail: nullify(d.contactEmail),
    phone: nullify(d.phone),
    headquarters: nullify(d.headquarters),
    type: nullify(d.type),
    industry: nullify(d.industry),
  };

  try {
    await prisma.company.upsert({
      where: { userId: user.id },
      update: data,
      create: { userId: user.id, ...data },
    });
  } catch {
    return { success: false, error: "Could not save. Please try again." };
  }

  revalidatePath("/business/company");
  revalidatePath("/business/dashboard");
  return { success: true };
}
