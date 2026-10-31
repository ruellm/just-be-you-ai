"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentCompany } from "@/lib/auth";
import { extractDocument } from "@/lib/resume-parse";
import { analyzeJobDescription as runAnalysis } from "@/lib/ai/job-description";
import {
  analyzeJobInputSchema,
  JD_ALLOWED_EXTS,
  JD_MAX_BYTES,
  JD_TEXT_MAX_CHARS,
  type AnalyzeJobInput,
  type ExtractedJobFields,
  type JobHints,
  type SkillRef,
} from "./ai-schemas";

// AI helpers for the business job form. Nothing here touches the database
// beyond reading the Skill taxonomy; results live in the client until the
// job is saved through the normal create action.

type Failure = { success: false; error: string };

const fileMetaSchema = z.object({
  ext: z.enum(JD_ALLOWED_EXTS),
  size: z
    .number()
    .int()
    .positive()
    .max(JD_MAX_BYTES, "File must be 5MB or smaller."),
});

async function loadTaxonomy(): Promise<SkillRef[]> {
  return prisma.skill.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

function selectedSkills(taxonomy: SkillRef[], ids: string[]): SkillRef[] {
  const byId = new Map(taxonomy.map((s) => [s.id, s]));
  return ids.map((id) => byId.get(id)).filter((s): s is SkillRef => Boolean(s));
}

// Step 1 of the upload: read the file's visible text. Hidden text is dropped
// by the shared extractor and never reaches the model.
export async function extractJobFileText(
  formData: FormData
): Promise<{ success: true; text: string } | Failure> {
  const company = await getCurrentCompany();
  if (!company) return { success: false, error: "You are not signed in." };

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
          ? "Only PDF, TXT or DOCX files are allowed."
          : (issue?.message ?? "Invalid file."),
    };
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { text, flags } = await extractDocument(
      buffer,
      meta.data.ext,
      JD_TEXT_MAX_CHARS
    );
    if (flags.length) {
      console.warn(
        `[job-description] ${flags.length} hidden-text flag(s) in uploaded JD: ` +
          flags.map((f) => f.signature).join(", ")
      );
    }
    if (!text) {
      return {
        success: false,
        error: "We couldn't read any text from that file.",
      };
    }
    return { success: true, text };
  } catch (error) {
    console.error("[job-description] Failed to read uploaded file:", error);
    return {
      success: false,
      error: "We couldn't read that file. Try a different format.",
    };
  }
}

// Step 2 of the upload, and every "Improve with AI" button: one Claude call
// that returns the form fields (file only) and the hints.
export async function analyzeJobDescription(
  input: AnalyzeJobInput
): Promise<
  | { success: true; fields: ExtractedJobFields | null; hints: JobHints }
  | Failure
> {
  const company = await getCurrentCompany();
  if (!company) return { success: false, error: "You are not signed in." };

  const parsed = analyzeJobInputSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input." };

  try {
    const taxonomy = await loadTaxonomy();
    const source =
      "text" in parsed.data
        ? ({ kind: "file", text: parsed.data.text } as const)
        : ({ kind: "form", values: parsed.data.values } as const);
    const selected =
      source.kind === "form"
        ? selectedSkills(taxonomy, source.values.skillIds)
        : [];
    const result = await runAnalysis(source, selected, taxonomy);
    return { success: true, fields: result.fields, hints: result.hints };
  } catch (error) {
    console.error("[job-description] Analysis failed:", error);
    return {
      success: false,
      error: "We couldn't analyze the job details right now. Please try again.",
    };
  }
}
