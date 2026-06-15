"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserRole } from "@/lib/auth";
import { generateQuestionsForApplication } from "@/lib/ai/generate-questions";

type Result = { success: true } | { success: false; error?: string };

// Admin-only: delete and recreate the generated questions for an application.
export async function regenerateQuestions(
  applicationId: string
): Promise<Result> {
  if ((await getCurrentUserRole()) !== "admin") {
    return { success: false, error: "Not authorized." };
  }

  try {
    await generateQuestionsForApplication(applicationId);
  } catch (error) {
    console.error("[regenerate-questions] failed:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not regenerate questions.",
    };
  }

  revalidatePath(`/admin/applications/${applicationId}/questions`);
  return { success: true };
}
