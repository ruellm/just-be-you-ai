import { z } from "zod";

export const jobLevelSchema = z.enum(["entry", "novice", "advanced", "expert"]);
export const jobWorkModeSchema = z.enum(["onsite", "remote", "hybrid"]);
export const jobStatusSchema = z.enum(["open", "closed"]);

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
