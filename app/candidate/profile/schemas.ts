import { z } from "zod";

// All fields are string-shaped (the form always supplies strings, defaulting
// empty to ""), so z.input === z.output and react-hook-form types stay clean.
// Numbers are kept as digit-strings here and parsed to Int in the action;
// empty optional strings are converted to null before hitting Prisma.

// Max lengths for candidate-typed fields. The Zod schemas below enforce these
// server-side (source of truth); the form inputs reuse them as `maxLength` so
// typing stops at the same cap. Keep both layers reading from this object.
export const FIELD_LIMITS = {
  name: 100, // first / last name
  location: 100, // country / city / nationality
  phone: 40,
  url: 300, // linkedin + project URLs
  preferredRole: 120,
  language: 50, // one spoken-language chip
  summary: 2000,
  school: 200,
  degree: 150,
  fieldOfStudy: 150,
  position: 150,
  companyName: 150,
  projectName: 200,
  description: 4000, // work-experience + project description
  salaryDigits: 9, // ≤ 9 digits always fits a Postgres Int
  yearsDigits: 2, // 0–99 years
} as const;

const tooLong = (limit: number) => `Keep it under ${limit} characters`;

export const basicInfoSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "First name is required")
    .max(FIELD_LIMITS.name, tooLong(FIELD_LIMITS.name)),
  lastName: z
    .string()
    .trim()
    .min(1, "Last name is required")
    .max(FIELD_LIMITS.name, tooLong(FIELD_LIMITS.name)),
  country: z.string().trim().max(FIELD_LIMITS.location, tooLong(FIELD_LIMITS.location)),
  city: z.string().trim().max(FIELD_LIMITS.location, tooLong(FIELD_LIMITS.location)),
  phone: z.string().trim().max(FIELD_LIMITS.phone, tooLong(FIELD_LIMITS.phone)),
  linkedinUrl: z.union([
    z.literal(""),
    z
      .string()
      .trim()
      .url("Enter a valid URL")
      .max(FIELD_LIMITS.url, tooLong(FIELD_LIMITS.url)),
  ]),
  expectedSalary: z
    .string()
    .trim()
    .regex(/^\d*$/, "Enter a whole number")
    .max(FIELD_LIMITS.salaryDigits, "Enter a smaller amount"),
  nationality: z
    .string()
    .trim()
    .max(FIELD_LIMITS.location, tooLong(FIELD_LIMITS.location)),
  languages: z
    .array(
      z
        .string()
        .trim()
        .min(1)
        .max(FIELD_LIMITS.language, tooLong(FIELD_LIMITS.language))
    )
    .max(30),
  totalYearsExperience: z
    .string()
    .trim()
    .regex(/^\d*$/, "Enter a whole number")
    .max(FIELD_LIMITS.yearsDigits, "Enter a value between 0 and 99"),
  preferredRole: z
    .string()
    .trim()
    .max(FIELD_LIMITS.preferredRole, tooLong(FIELD_LIMITS.preferredRole)),
});

export type BasicInfoValues = z.infer<typeof basicInfoSchema>;

export const summarySchema = z.object({
  summary: z
    .string()
    .trim()
    .max(FIELD_LIMITS.summary, tooLong(FIELD_LIMITS.summary)),
});

export type SummaryValues = z.infer<typeof summarySchema>;

// Shape returned by every profile server action.
export type ActionResult =
  | { success: true }
  | { success: false; error?: string; fieldErrors?: Record<string, string> };

// ── Education ────────────────────────────────────────────────────────────────
export const educationSchema = z.object({
  school: z
    .string()
    .trim()
    .min(1, "School is required")
    .max(FIELD_LIMITS.school, tooLong(FIELD_LIMITS.school)),
  country: z.string().trim().max(FIELD_LIMITS.location, tooLong(FIELD_LIMITS.location)),
  degree: z.string().trim().max(FIELD_LIMITS.degree, tooLong(FIELD_LIMITS.degree)),
  fieldOfStudy: z
    .string()
    .trim()
    .max(FIELD_LIMITS.fieldOfStudy, tooLong(FIELD_LIMITS.fieldOfStudy)),
  startDate: z.string(), // "YYYY-MM-DD" or ""
  endDate: z.string(),
  currentlyStudying: z.boolean(),
});
export type EducationValues = z.infer<typeof educationSchema>;

// ── Skills ───────────────────────────────────────────────────────────────────
export const candidateSkillSchema = z.object({
  skillId: z.string().min(1, "Pick a skill"),
  yearsOfExperience: z
    .string()
    .trim()
    .regex(/^\d*$/, "Enter a whole number")
    .max(FIELD_LIMITS.yearsDigits, "Enter a value between 0 and 99"),
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
  position: z
    .string()
    .trim()
    .min(1, "Position is required")
    .max(FIELD_LIMITS.position, tooLong(FIELD_LIMITS.position)),
  companyName: z
    .string()
    .trim()
    .min(1, "Company is required")
    .max(FIELD_LIMITS.companyName, tooLong(FIELD_LIMITS.companyName)),
  startDate: z.string(),
  endDate: z.string(),
  currentlyWorking: z.boolean(),
  employmentType: employmentTypeSchema,
  description: z
    .string()
    .trim()
    .max(FIELD_LIMITS.description, tooLong(FIELD_LIMITS.description)),
});
export type WorkExperienceValues = z.infer<typeof workExperienceSchema>;

// ── Projects (nested under a work experience) ────────────────────────────────
export const projectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Project name is required")
    .max(FIELD_LIMITS.projectName, tooLong(FIELD_LIMITS.projectName)),
  url: z.union([
    z.literal(""),
    z
      .string()
      .trim()
      .url("Enter a valid URL")
      .max(FIELD_LIMITS.url, tooLong(FIELD_LIMITS.url)),
  ]),
  startDate: z.string(),
  endDate: z.string(),
  ongoing: z.boolean(),
  description: z
    .string()
    .trim()
    .max(FIELD_LIMITS.description, tooLong(FIELD_LIMITS.description)),
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
