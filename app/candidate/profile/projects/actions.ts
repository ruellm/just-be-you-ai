"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCandidateProfileId } from "@/lib/profile";
import { toDateOrNull } from "@/lib/profile-format";
import { fieldErrorsFrom } from "@/lib/zod";
import { projectSchema, type ActionResult, type ProjectValues } from "../schemas";

function nullify(value: string): string | null {
  return value.trim() === "" ? null : value.trim();
}

function revalidate() {
  revalidatePath("/candidate/profile");
  revalidatePath("/candidate/profile/projects");
  revalidatePath("/candidate/dashboard");
}

// ── Projects (standalone profile section, scoped by candidateProfileId) ──────
export async function saveProject(
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
      // Scoped by candidateProfileId so a candidate can only edit their own rows.
      const existing = await prisma.project.findFirst({
        where: { id, candidateProfileId: profileId },
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
          candidateProfileId: profileId,
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
    where: { id, candidateProfileId: profileId },
  });

  revalidate();
  return { success: true };
}
