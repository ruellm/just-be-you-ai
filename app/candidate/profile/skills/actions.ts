"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCandidateProfileId } from "@/lib/profile";
import { fieldErrorsFrom } from "@/lib/zod";
import {
  candidateSkillSchema,
  type ActionResult,
  type CandidateSkillValues,
} from "../schemas";

function toYears(value: string): number {
  const trimmed = value.trim();
  return trimmed === "" ? 0 : Number.parseInt(trimmed, 10);
}

function revalidate() {
  revalidatePath("/candidate/profile");
  revalidatePath("/candidate/profile/skills");
  revalidatePath("/candidate/dashboard");
}

export async function addSkill(
  values: CandidateSkillValues
): Promise<ActionResult> {
  const profileId = await getCandidateProfileId();
  if (!profileId) return { success: false, error: "You are not signed in." };

  const parsed = candidateSkillSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  try {
    await prisma.candidateSkill.create({
      data: {
        candidateProfileId: profileId,
        skillId: parsed.data.skillId,
        yearsOfExperience: toYears(parsed.data.yearsOfExperience),
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { success: false, error: "You've already added this skill." };
    }
    return { success: false, error: "Could not add skill. Please try again." };
  }

  revalidate();
  return { success: true };
}

export async function updateSkillYears(
  id: string,
  years: string
): Promise<ActionResult> {
  const profileId = await getCandidateProfileId();
  if (!profileId) return { success: false, error: "You are not signed in." };

  // Reuse the schema field so the digit + length rules stay in one place.
  const parsedYears = candidateSkillSchema.shape.yearsOfExperience.safeParse(years);
  if (!parsedYears.success) {
    const message =
      parsedYears.error.issues[0]?.message ?? "Enter a whole number";
    return {
      success: false,
      error: message,
      fieldErrors: { yearsOfExperience: message },
    };
  }

  await prisma.candidateSkill.updateMany({
    where: { id, candidateProfileId: profileId },
    data: { yearsOfExperience: toYears(parsedYears.data) },
  });

  revalidate();
  return { success: true };
}

export async function deleteCandidateSkill(id: string): Promise<ActionResult> {
  const profileId = await getCandidateProfileId();
  if (!profileId) return { success: false, error: "You are not signed in." };

  await prisma.candidateSkill.deleteMany({
    where: { id, candidateProfileId: profileId },
  });

  revalidate();
  return { success: true };
}
