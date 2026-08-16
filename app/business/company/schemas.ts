import { z } from "zod";

// Client-side maxLength + server-side Zod caps for the company profile.
export const FIELD_LIMITS = {
  name: 150,
  description: 300, // design: "N/300 characters" (was 2000)
  url: 300, // website + logo URL
  contactEmail: 200,
  phone: 40,
  headquarters: 150,
  type: 100, // free text, e.g. "Privately Held"
  industry: 100,
  yearDigits: 4,
} as const;

const tooLong = (n: number) => `Must be ${n} characters or fewer`;
const optionalUrl = z.union([
  z.literal(""),
  z.string().trim().url("Enter a valid URL").max(FIELD_LIMITS.url, tooLong(FIELD_LIMITS.url)),
]);

const CURRENT_YEAR = new Date().getFullYear();

export const companySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Company name is required")
    .max(FIELD_LIMITS.name, tooLong(FIELD_LIMITS.name)),
  description: z
    .string()
    .trim()
    .max(FIELD_LIMITS.description, tooLong(FIELD_LIMITS.description)),
  // Required per the redesign (was optional). Existing companies with a blank
  // website must fill it in before their next save.
  website: z
    .string()
    .trim()
    .min(1, "Company website is required")
    .url("Enter a valid URL")
    .max(FIELD_LIMITS.url, tooLong(FIELD_LIMITS.url)),
  logoUrl: optionalUrl,
  // Blank = not set; else a 4-digit year up to the current year.
  yearFounded: z
    .string()
    .trim()
    .regex(/^\d*$/, "Enter a year")
    .refine(
      (v) =>
        v === "" ||
        (v.length === 4 &&
          Number.parseInt(v, 10) >= 1800 &&
          Number.parseInt(v, 10) <= CURRENT_YEAR),
      { message: `Enter a year between 1800 and ${CURRENT_YEAR}` }
    ),
  contactEmail: z.union([
    z.literal(""),
    z
      .string()
      .trim()
      .email("Enter a valid email")
      .max(FIELD_LIMITS.contactEmail, tooLong(FIELD_LIMITS.contactEmail)),
  ]),
  phone: z.string().trim().max(FIELD_LIMITS.phone, tooLong(FIELD_LIMITS.phone)),
  headquarters: z
    .string()
    .trim()
    .max(FIELD_LIMITS.headquarters, tooLong(FIELD_LIMITS.headquarters)),
  type: z.string().trim().max(FIELD_LIMITS.type, tooLong(FIELD_LIMITS.type)),
  industry: z
    .string()
    .trim()
    .max(FIELD_LIMITS.industry, tooLong(FIELD_LIMITS.industry)),
});

export type CompanyValues = z.infer<typeof companySchema>;

export type ActionResult =
  | { success: true }
  | { success: false; error?: string; fieldErrors?: Record<string, string> };
