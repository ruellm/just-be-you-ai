"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
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

  // Capture the old path so we can clean it up after the DB points at the new one.
  const existing = await prisma.candidateProfile.findUnique({
    where: { userId: user.id },
    select: { resumeUrl: true },
  });

  await prisma.candidateProfile.upsert({
    where: { userId: user.id },
    update: { resumeUrl: path },
    create: { userId: user.id, resumeUrl: path },
  });

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
      data: { resumeUrl: null },
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
