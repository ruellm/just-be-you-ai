"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  basicInfoSchema,
  summarySchema,
  type ActionResult,
  type BasicInfoValues,
  type SummaryValues,
} from "./schemas";

// "" -> null for optional text columns.
function nullify(value: string): string | null {
  return value.trim() === "" ? null : value.trim();
}

// digit-string -> Int | null
function toIntOrNull(value: string): number | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : Number.parseInt(trimmed, 10);
}

// Turn a Zod error into a flat { field: message } map for the client.
function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !(key in out)) {
      out[key] = issue.message;
    }
  }
  return out;
}

export async function saveBasicInfo(
  values: BasicInfoValues
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "You are not signed in." };

  const parsed = basicInfoSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const d = parsed.data;

  try {
    await prisma.candidateProfile.upsert({
      where: { userId: user.id },
      update: {
        firstName: nullify(d.firstName),
        lastName: nullify(d.lastName),
        country: nullify(d.country),
        city: nullify(d.city),
        phone: nullify(d.phone),
        linkedinUrl: nullify(d.linkedinUrl),
        expectedSalary: toIntOrNull(d.expectedSalary),
        nationality: nullify(d.nationality),
        languages: d.languages,
        totalYearsExperience: toIntOrNull(d.totalYearsExperience),
        preferredRole: nullify(d.preferredRole),
      },
      create: {
        userId: user.id,
        firstName: nullify(d.firstName),
        lastName: nullify(d.lastName),
        country: nullify(d.country),
        city: nullify(d.city),
        phone: nullify(d.phone),
        linkedinUrl: nullify(d.linkedinUrl),
        expectedSalary: toIntOrNull(d.expectedSalary),
        nationality: nullify(d.nationality),
        languages: d.languages,
        totalYearsExperience: toIntOrNull(d.totalYearsExperience),
        preferredRole: nullify(d.preferredRole),
      },
    });
  } catch {
    return { success: false, error: "Could not save. Please try again." };
  }

  revalidatePath("/candidate/profile/basic-info");
  revalidatePath("/candidate/dashboard");
  return { success: true };
}

export async function saveSummary(
  values: SummaryValues
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "You are not signed in." };

  const parsed = summarySchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  try {
    await prisma.candidateProfile.upsert({
      where: { userId: user.id },
      update: { summary: nullify(parsed.data.summary) },
      create: { userId: user.id, summary: nullify(parsed.data.summary) },
    });
  } catch {
    return { success: false, error: "Could not save. Please try again." };
  }

  revalidatePath("/candidate/profile/summary");
  revalidatePath("/candidate/dashboard");
  return { success: true };
}
