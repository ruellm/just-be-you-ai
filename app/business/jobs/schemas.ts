import { z } from "zod";
import { ALL_SUB_CRITERION_KEYS } from "@/lib/ai/rubric";

export const jobLevelSchema = z.enum(["entry", "novice", "advanced", "expert"]);
export const jobPassingBarSchema = z.enum(["selective", "standard"]);
export const jobWorkModeSchema = z.enum(["onsite", "remote", "hybrid"]);
export const jobStatusSchema = z.enum(["open", "closed"]);
export const jobVoiceAgentTypeSchema = z.enum(["basic", "advanced"]);

export const jobSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(150),
    description: z.string().trim().min(1, "Description is required").max(5000),
    roleOverview: z.string().trim().max(5000),
    requirements: z.string().trim().max(5000),
    dayToDay: z.string().trim().max(5000),
    level: jobLevelSchema,
    workMode: jobWorkModeSchema,
    location: z.string().trim().max(150),
    salaryMin: z.string().trim().regex(/^\d*$/, "Enter a whole number"),
    salaryMax: z.string().trim().regex(/^\d*$/, "Enter a whole number"),
    status: jobStatusSchema,
    skillIds: z.array(z.string()).max(50),
    // AI interview configuration (optional)
    interviewHints: z.string().trim().max(5000),
    idealCandidateProfile: z.string().trim().max(5000),
    passingCriteria: z.string().trim().max(5000),
    // Voice engine for this job's interviews. Stored/displayed only for now.
    voiceAgentType: jobVoiceAgentTypeSchema,
    // Rubric passing curve ("selective" = default strict bar).
    passingBar: jobPassingBarSchema,
    // Must-have sub-criterion keys (hard-gated). Unknown keys are silently
    // stripped against the rubric's known keys — the client only offers known
    // ones, so anything else is stale/tampered input.
    mustHaveCriteria: z
      .array(z.string())
      .max(ALL_SUB_CRITERION_KEYS.length * 2)
      .transform((keys) =>
        keys.filter((k) => ALL_SUB_CRITERION_KEYS.includes(k))
      ),
    // Max interview duration in minutes. Blank = system default (30); else 5-60.
    interviewMaxMinutes: z
      .string()
      .trim()
      .regex(/^\d*$/, "Enter a whole number")
      .refine(
        (v) => v === "" || (Number.parseInt(v, 10) >= 5 && Number.parseInt(v, 10) <= 60),
        { message: "Enter a value between 5 and 60, or leave blank" }
      ),
  })
  .refine(
    (d) =>
      !d.salaryMin ||
      !d.salaryMax ||
      Number.parseInt(d.salaryMin, 10) <= Number.parseInt(d.salaryMax, 10),
    { message: "Min salary can't exceed max", path: ["salaryMax"] }
  );

export type JobValues = z.infer<typeof jobSchema>;

export type JobActionResult =
  | { success: true; jobId?: string }
  | {
      success: false;
      error?: string;
      fieldErrors?: Record<string, string>;
      redirectTo?: string;
    };
