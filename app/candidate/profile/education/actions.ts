"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCandidateProfileId } from "@/lib/profile";
import { toDateOrNull } from "@/lib/profile-format";
import { fieldErrorsFrom } from "@/lib/zod";
import {
  educationSchema,
  type ActionResult,
  type EducationValues,
} from "../schemas";

function nullify(value: string): string | null {
  return value.trim() === "" ? null : value.trim();
}

function revalidate() {
  revalidatePath("/candidate/profile");
  revalidatePath("/candidate/profile/education");
  revalidatePath("/candidate/dashboard");
}

export async function saveEducation(
  values: EducationValues,
  id?: string
): Promise<ActionResult> {
  const profileId = await getCandidateProfileId();
  if (!profileId) return { success: false, error: "You are not signed in." };

  const parsed = educationSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const d = parsed.data;
  const data = {
    school: d.school,
    country: nullify(d.country),
    degree: nullify(d.degree),
    fieldOfStudy: nullify(d.fieldOfStudy),
    startDate: toDateOrNull(d.startDate),
    endDate: d.currentlyStudying ? null : toDateOrNull(d.endDate),
    currentlyStudying: d.currentlyStudying,
  };

  try {
    if (id) {
      // Scoped by candidateProfileId so a candidate can only edit their own rows.
      await prisma.education.updateMany({
        where: { id, candidateProfileId: profileId },
        data,
      });
    } else {
      await prisma.education.create({
        data: { ...data, candidateProfileId: profileId },
      });
    }
  } catch {
    return { success: false, error: "Could not save. Please try again." };
  }

  revalidate();
  return { success: true };
}

export async function deleteEducation(id: string): Promise<ActionResult> {
  const profileId = await getCandidateProfileId();
  if (!profileId) return { success: false, error: "You are not signed in." };

  await prisma.education.deleteMany({
    where: { id, candidateProfileId: profileId },
  });

  revalidate();
  return { success: true };
}
