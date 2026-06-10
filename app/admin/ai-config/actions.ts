"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUserRole } from "@/lib/auth";
import { fieldErrorsFrom } from "@/lib/zod";
import {
  questionSetSchema,
  type ActionResult,
  type QuestionSetValues,
} from "./schemas";

async function requireAdmin(): Promise<boolean> {
  return (await getCurrentUserRole()) === "admin";
}

// Drop blank rows and number the rest.
function cleanQuestions(questions: { text: string }[]) {
  return questions
    .map((q) => q.text.trim())
    .filter(Boolean)
    .map((text, order) => ({ text, order }));
}

export async function createQuestionSet(
  values: QuestionSetValues
): Promise<ActionResult> {
  if (!(await requireAdmin())) return { success: false, error: "Not authorized." };

  const parsed = questionSetSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const d = parsed.data;

  await prisma.questionSet.create({
    data: {
      name: d.name,
      vertical: d.vertical,
      description: d.description.trim() || null,
      questions: { create: cleanQuestions(d.questions) },
    },
  });

  revalidatePath("/admin/ai-config");
  return { success: true };
}

export async function updateQuestionSet(
  id: string,
  values: QuestionSetValues
): Promise<ActionResult> {
  if (!(await requireAdmin())) return { success: false, error: "Not authorized." };

  const parsed = questionSetSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const d = parsed.data;

  await prisma.questionSet.update({
    where: { id },
    data: {
      name: d.name,
      vertical: d.vertical,
      description: d.description.trim() || null,
      questions: { deleteMany: {}, create: cleanQuestions(d.questions) },
    },
  });

  revalidatePath("/admin/ai-config");
  revalidatePath(`/admin/ai-config/${id}/edit`);
  return { success: true };
}

export async function deleteQuestionSet(id: string): Promise<ActionResult> {
  if (!(await requireAdmin())) return { success: false, error: "Not authorized." };

  await prisma.questionSet.delete({ where: { id } });
  revalidatePath("/admin/ai-config");
  return { success: true };
}
