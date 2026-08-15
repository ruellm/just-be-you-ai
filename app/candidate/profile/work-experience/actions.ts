"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCandidateProfileId } from "@/lib/profile";
import { toDateOrNull } from "@/lib/profile-format";
import { fieldErrorsFrom } from "@/lib/zod";
import {
  workExperienceSchema,
  type ActionResult,
  type WorkExperienceValues,
} from "../schemas";

function nullify(value: string): string | null {
  return value.trim() === "" ? null : value.trim();
}

function revalidate() {
  revalidatePath("/candidate/profile");
  revalidatePath("/candidate/profile/work-experience");
  revalidatePath("/candidate/dashboard");
}

// ── Work experience ──────────────────────────────────────────────────────────
export async function saveWorkExperience(
  values: WorkExperienceValues,
  id?: string
): Promise<ActionResult> {
  const profileId = await getCandidateProfileId();
  if (!profileId) return { success: false, error: "You are not signed in." };

  const parsed = workExperienceSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const d = parsed.data;
  const data = {
    position: d.position,
    companyName: d.companyName,
    startDate: toDateOrNull(d.startDate),
    endDate: d.currentlyWorking ? null : toDateOrNull(d.endDate),
    currentlyWorking: d.currentlyWorking,
    employmentType: d.employmentType,
    description: nullify(d.description),
  };

  try {
    if (id) {
      await prisma.workExperience.updateMany({
        where: { id, candidateProfileId: profileId },
        data,
      });
    } else {
      await prisma.workExperience.create({
        data: { ...data, candidateProfileId: profileId },
      });
    }
  } catch {
    return { success: false, error: "Could not save. Please try again." };
  }

  revalidate();
  return { success: true };
}

export async function deleteWorkExperience(id: string): Promise<ActionResult> {
  const profileId = await getCandidateProfileId();
  if (!profileId) return { success: false, error: "You are not signed in." };

  // Cascade (schema) removes the work experience's projects too.
  await prisma.workExperience.deleteMany({
    where: { id, candidateProfileId: profileId },
  });

  revalidate();
  return { success: true };
}
