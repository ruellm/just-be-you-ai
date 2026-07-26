"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractResumeText } from "@/lib/resume-parse";
import { cleanResumeText } from "@/lib/ai/clean-resume";
import {
  RESUME_ALLOWED_TYPES,
  RESUME_MAX_BYTES,
  type ActionResult,
} from "../schemas";

const BUCKET = "resumes";

function revalidate() {
  revalidatePath("/candidate/profile/resume");
  revalidatePath("/candidate/dashboard");
}

// Keep the original name readable but safe for a storage key.
function safeName(name: string): string {
  return name.replace(/[^\w.\-]+/g, "_").slice(0, 120);
}

// Zod validates the derived file metadata; manual checks cover the File itself.
const fileMetaSchema = z.object({
  ext: z.enum(["pdf", "docx"]),
  size: z.number().int().positive().max(RESUME_MAX_BYTES, "File must be 5MB or smaller."),
});

export async function uploadResume(formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "You are not signed in." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: "No file selected." };
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const meta = fileMetaSchema.safeParse({ ext, size: file.size });
  if (!meta.success) {
    const issue = meta.error.issues[0];
    return {
      success: false,
      error:
        issue?.path[0] === "ext"
          ? "Only PDF or DOCX files are allowed."
          : (issue?.message ?? "Invalid file."),
    };
  }

  const contentType = RESUME_ALLOWED_TYPES[meta.data.ext];
  const path = `${user.id}/${Date.now()}-${safeName(file.name)}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const admin = createAdminClient();
  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType, upsert: false });
  if (uploadError) {
    return { success: false, error: "Upload failed. Please try again." };
  }

  // Capture the old path so we can clean it up after the DB points at the new
  // one (+ the name, which anchors "who the candidate is" for resume cleanup).
  const existing = await prisma.candidateProfile.findUnique({
    where: { userId: user.id },
    select: { resumeUrl: true, firstName: true, lastName: true },
  });

  // Extract text from the bytes we already have in memory (no need to
  // re-download from Storage). Parsing must NEVER fail the upload — on any
  // error/empty result we store null. On a replace this also overwrites (i.e.
  // clears) any previously parsed text.
  let parsedText: string | null = null;
  try {
    const text = await extractResumeText(buffer, meta.data.ext);
    parsedText = text.length > 0 ? text : null;
    if (!parsedText) {
      console.warn(`[resume-parse] No text extracted from ${path}`);
    }
  } catch (parseError) {
    console.error("[resume-parse] Failed to parse uploaded resume:", parseError);
    parsedText = null;
  }

  // cleanedResumeText derives from parsedResumeText, so a new resume clears it
  // first; the cleanup pass below repopulates it from the fresh parsed text.
  await prisma.candidateProfile.upsert({
    where: { userId: user.id },
    update: {
      resumeUrl: path,
      parsedResumeText: parsedText,
      resumeParsedAt: parsedText ? new Date() : null,
      cleanedResumeText: null,
    },
    create: {
      userId: user.id,
      resumeUrl: path,
      parsedResumeText: parsedText,
      resumeParsedAt: parsedText ? new Date() : null,
      cleanedResumeText: null,
    },
  });

  // Resume cleanup (PII strip → cleanedResumeText) runs HERE, once per
  // upload/replace, so Apply never waits on it. Awaited so the field is
  // reliably populated before the (much later) Apply; a few extra seconds on
  // upload is fine. Must NEVER fail the upload — cleanResumeText itself fails
  // open to the raw text, and this try/catch guards the DB write. If it does
  // fail (cleanedResumeText stays null), the interview prompt builders fall
  // back to parsedResumeText.
  if (parsedText) {
    try {
      const candidateName =
        [existing?.firstName, existing?.lastName].filter(Boolean).join(" ") ||
        null;
      const cleaned = await cleanResumeText(parsedText, candidateName);
      await prisma.candidateProfile.update({
        where: { userId: user.id },
        data: { cleanedResumeText: cleaned },
      });
    } catch (cleanError) {
      console.error(
        "[clean-resume] Failed to clean uploaded resume:",
        cleanError
      );
    }
  }

  // Best-effort delete of the previous file (replace flow).
  if (existing?.resumeUrl && existing.resumeUrl !== path) {
    await admin.storage.from(BUCKET).remove([existing.resumeUrl]);
  }

  revalidate();
  return { success: true };
}

export async function deleteResume(): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "You are not signed in." };

  const profile = await prisma.candidateProfile.findUnique({
    where: { userId: user.id },
    select: { resumeUrl: true },
  });

  if (profile?.resumeUrl) {
    const admin = createAdminClient();
    await admin.storage.from(BUCKET).remove([profile.resumeUrl]);
    await prisma.candidateProfile.update({
      where: { userId: user.id },
      data: {
        resumeUrl: null,
        parsedResumeText: null,
        resumeParsedAt: null,
        cleanedResumeText: null,
      },
    });
  }

  revalidate();
  return { success: true };
}

// Fresh short-lived signed URL, generated on demand (so it can't expire while
// the page sits open). Service role key stays on the server.
export async function getResumeSignedUrl(): Promise<
  { url: string } | { error: string }
> {
  const user = await getCurrentUser();
  if (!user) return { error: "You are not signed in." };

  const profile = await prisma.candidateProfile.findUnique({
    where: { userId: user.id },
    select: { resumeUrl: true },
  });
  if (!profile?.resumeUrl) return { error: "No resume on file." };

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(profile.resumeUrl, 60);
  if (error || !data) return { error: "Could not generate link." };

  return { url: data.signedUrl };
}
