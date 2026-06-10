import { z } from "zod";

// All fields are string-shaped (the form always supplies strings, defaulting
// empty to ""), so z.input === z.output and react-hook-form types stay clean.
// Numbers are kept as digit-strings here and parsed to Int in the action;
// empty optional strings are converted to null before hitting Prisma.

export const basicInfoSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(100),
  lastName: z.string().trim().min(1, "Last name is required").max(100),
  country: z.string().trim().max(100),
  city: z.string().trim().max(100),
  phone: z.string().trim().max(40),
  linkedinUrl: z.union([
    z.literal(""),
    z.string().trim().url("Enter a valid URL"),
  ]),
  expectedSalary: z.string().trim().regex(/^\d*$/, "Enter a whole number"),
  nationality: z.string().trim().max(100),
  languages: z.array(z.string().trim().min(1)).max(30),
  totalYearsExperience: z
    .string()
    .trim()
    .regex(/^\d*$/, "Enter a whole number"),
  preferredRole: z.string().trim().max(120),
});

export type BasicInfoValues = z.infer<typeof basicInfoSchema>;

export const summarySchema = z.object({
  summary: z.string().trim().max(2000, "Keep it under 2000 characters"),
});

export type SummaryValues = z.infer<typeof summarySchema>;

// Shape returned by every profile server action.
export type ActionResult =
  | { success: true }
  | { success: false; error?: string; fieldErrors?: Record<string, string> };

// ── Education ────────────────────────────────────────────────────────────────
export const educationSchema = z.object({
  school: z.string().trim().min(1, "School is required").max(200),
  country: z.string().trim().max(100),
  degree: z.string().trim().max(150),
  fieldOfStudy: z.string().trim().max(150),
  startDate: z.string(), // "YYYY-MM-DD" or ""
  endDate: z.string(),
  currentlyStudying: z.boolean(),
});
export type EducationValues = z.infer<typeof educationSchema>;

// ── Skills ───────────────────────────────────────────────────────────────────
export const candidateSkillSchema = z.object({
  skillId: z.string().min(1, "Pick a skill"),
  yearsOfExperience: z.string().trim().regex(/^\d*$/, "Enter a whole number"),
});
export type CandidateSkillValues = z.infer<typeof candidateSkillSchema>;

// ── Work experience ──────────────────────────────────────────────────────────
export const employmentTypeSchema = z.enum([
  "full_time",
  "part_time",
  "freelance",
  "self_employed",
  "contract",
  "internship",
  "other",
]);
export type EmploymentTypeValue = z.infer<typeof employmentTypeSchema>;

export const workExperienceSchema = z.object({
  position: z.string().trim().min(1, "Position is required").max(150),
  companyName: z.string().trim().min(1, "Company is required").max(150),
  startDate: z.string(),
  endDate: z.string(),
  currentlyWorking: z.boolean(),
  employmentType: employmentTypeSchema,
  description: z.string().trim().max(4000),
});
export type WorkExperienceValues = z.infer<typeof workExperienceSchema>;

// ── Projects (nested under a work experience) ────────────────────────────────
export const projectSchema = z.object({
  name: z.string().trim().min(1, "Project name is required").max(200),
  url: z.union([z.literal(""), z.string().trim().url("Enter a valid URL")]),
  startDate: z.string(),
  endDate: z.string(),
  ongoing: z.boolean(),
  description: z.string().trim().max(4000),
  skillIds: z.array(z.string()).max(50),
});
export type ProjectValues = z.infer<typeof projectSchema>;

// ── Resume upload ────────────────────────────────────────────────────────────
export const RESUME_MAX_BYTES = 5 * 1024 * 1024; // 5MB

// Allowed upload types: extension -> MIME (used for the storage contentType).
export const RESUME_ALLOWED_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

// For the <input accept> attribute.
export const RESUME_ACCEPT =
  ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

// Labels for the EmploymentType enum (UI display).
export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentTypeValue, string> = {
  full_time: "Full time",
  part_time: "Part time",
  freelance: "Freelance",
  self_employed: "Self-employed",
  contract: "Contract",
  internship: "Internship",
  other: "Other",
};
