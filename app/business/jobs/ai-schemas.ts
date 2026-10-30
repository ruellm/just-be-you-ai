import { z } from "zod";
import { jobLevelSchema, jobWorkModeSchema, JOB_TEXT_LIMITS } from "./schemas";

// Types shared by the job form's AI helpers (JD upload, AI Hints, Improve
// with AI). Plain Zod + types so both the client and the server actions can
// import this file.

export const JD_MAX_BYTES = 5 * 1024 * 1024;
export const JD_ALLOWED_EXTS = ["pdf", "docx", "txt"] as const;
export const JD_ACCEPT =
  ".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain";
export const JD_TEXT_MAX_CHARS = 30000;

// The four long-text sections the AI can draft or rewrite.
export const NARRATIVE_FIELDS = [
  "description",
  "roleOverview",
  "dayToDay",
  "requirements",
] as const;
export type NarrativeField = (typeof NARRATIVE_FIELDS)[number];
export const narrativeFieldSchema = z.enum(NARRATIVE_FIELDS);

export const NARRATIVE_FIELD_LABELS: Record<NarrativeField, string> = {
  description: "Job Description",
  roleOverview: "Role Overview",
  dayToDay: "What does day-to-day look like",
  requirements: "Requirements",
};

export const NARRATIVE_FIELD_LIMITS: Record<NarrativeField, number> = {
  description: JOB_TEXT_LIMITS.description,
  roleOverview: JOB_TEXT_LIMITS.roleOverview,
  dayToDay: JOB_TEXT_LIMITS.dayToDay,
  requirements: JOB_TEXT_LIMITS.requirements,
};

export const skillRefSchema = z.object({ id: z.string(), name: z.string() });
export type SkillRef = z.infer<typeof skillRefSchema>;

// What the model read out of a job description file. Skills are already
// resolved against the Skill taxonomy; null means the file did not say.
export const extractedJobFieldsSchema = z.object({
  title: z.string().nullable(),
  location: z.string().nullable(),
  level: jobLevelSchema.nullable(),
  workMode: jobWorkModeSchema.nullable(),
  salaryMin: z.number().int().nonnegative().nullable(),
  salaryMax: z.number().int().nonnegative().nullable(),
  requiredSkills: z.array(skillRefSchema),
  description: z.string().nullable(),
  roleOverview: z.string().nullable(),
  dayToDay: z.string().nullable(),
  requirements: z.string().nullable(),
});
export type ExtractedJobFields = z.infer<typeof extractedJobFieldsSchema>;

export const jobHintsSchema = z.object({
  missingSkills: z.array(skillRefSchema),
  missingInfo: z.array(
    z.object({ field: narrativeFieldSchema, draft: z.string() })
  ),
  qualifiers: z.array(z.object({ text: z.string() })),
  unmentionedSkills: z.array(skillRefSchema),
});
export type JobHints = z.infer<typeof jobHintsSchema>;

export function countHints(hints: JobHints): number {
  return (
    hints.missingSkills.length +
    hints.missingInfo.length +
    hints.qualifiers.length +
    hints.unmentionedSkills.length
  );
}

// Fields with nothing in them after extraction. Required Skills counts as
// one field.
export function countEmptyFields(fields: ExtractedJobFields): number {
  let empty = 0;
  for (const key of Object.keys(fields) as (keyof ExtractedJobFields)[]) {
    const value = fields[key];
    if (value === null || value === "") empty += 1;
    else if (Array.isArray(value) && value.length === 0) empty += 1;
  }
  return empty;
}

// The page-1 form values the AI helpers work from. No length caps here: a
// field that is over its cap is still useful context, and the form's own
// validation keeps the user from saving it.
export const jobAiInputSchema = z.object({
  title: z.string().max(500),
  location: z.string().max(500),
  level: jobLevelSchema,
  workMode: jobWorkModeSchema,
  salaryMin: z.string().max(20),
  salaryMax: z.string().max(20),
  skillIds: z.array(z.string()).max(50),
  description: z.string().max(5000),
  roleOverview: z.string().max(5000),
  dayToDay: z.string().max(5000),
  requirements: z.string().max(5000),
});
export type JobAiInput = z.infer<typeof jobAiInputSchema>;

export const analyzeJobInputSchema = z.union([
  z.object({ text: z.string().min(1).max(JD_TEXT_MAX_CHARS) }),
  z.object({ values: jobAiInputSchema }),
]);
export type AnalyzeJobInput = z.infer<typeof analyzeJobInputSchema>;
