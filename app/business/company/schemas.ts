import { z } from "zod";

export const companySchema = z.object({
  name: z.string().trim().min(1, "Company name is required").max(150),
  description: z.string().trim().max(2000),
  website: z.union([z.literal(""), z.string().trim().url("Enter a valid URL")]),
  logoUrl: z.union([z.literal(""), z.string().trim().url("Enter a valid URL")]),
});

export type CompanyValues = z.infer<typeof companySchema>;

export type ActionResult =
  | { success: true }
  | { success: false; error?: string; fieldErrors?: Record<string, string> };
