"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCandidateProfileId, toDateOrNull } from "@/lib/profile";
import { fieldErrorsFrom } from "@/lib/zod";
import {
  projectSchema,
  workExperienceSchema,
  type ActionResult,
  type ProjectValues,
  type WorkExperienceValues,
} from "../schemas";

function nullify(value: string): string | null {
  return value.trim() === "" ? null : value.trim();
}

function revalidate() {
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

// ── Projects (nested under a work experience) ────────────────────────────────
export async function saveProject(
  workExperienceId: string,
  values: ProjectValues,
  id?: string
): Promise<ActionResult> {
  const profileId = await getCandidateProfileId();
  if (!profileId) return { success: false, error: "You are not signed in." };

  const parsed = projectSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const d = parsed.data;

  // Ensure the parent work experience belongs to this candidate.
  const parent = await prisma.workExperience.findFirst({
    where: { id: workExperienceId, candidateProfileId: profileId },
    select: { id: true },
  });
  if (!parent) return { success: false, error: "Work experience not found." };

  const base = {
    name: d.name,
    url: nullify(d.url),
    startDate: toDateOrNull(d.startDate),
    endDate: d.ongoing ? null : toDateOrNull(d.endDate),
    ongoing: d.ongoing,
    description: nullify(d.description),
  };

  try {
    if (id) {
      const existing = await prisma.project.findFirst({
        where: { id, workExperienceId },
        select: { id: true },
      });
      if (!existing) return { success: false, error: "Project not found." };

      // Replace the project's skill links with the new selection.
      await prisma.project.update({
        where: { id },
        data: {
          ...base,
          skills: {
            deleteMany: {},
            create: d.skillIds.map((skillId) => ({ skillId })),
          },
        },
      });
    } else {
      await prisma.project.create({
        data: {
          ...base,
          workExperienceId,
          screenshots: [], // file upload comes after the resume step
          skills: { create: d.skillIds.map((skillId) => ({ skillId })) },
        },
      });
    }
  } catch {
    return { success: false, error: "Could not save project. Please try again." };
  }

  revalidate();
  return { success: true };
}

export async function deleteProject(id: string): Promise<ActionResult> {
  const profileId = await getCandidateProfileId();
  if (!profileId) return { success: false, error: "You are not signed in." };

  await prisma.project.deleteMany({
    where: { id, workExperience: { candidateProfileId: profileId } },
  });

  revalidate();
  return { success: true };
}
