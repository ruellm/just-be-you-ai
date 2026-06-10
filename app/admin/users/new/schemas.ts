import { z } from "zod";

export const provisionUserSchema = z
  .object({
    role: z.enum(["business", "admin"]),
    email: z.string().trim().email("Enter a valid email").max(200),
    fullName: z.string().trim().min(1, "Name is required").max(150),
    companyName: z.string().trim().max(150),
    password: z
      .string()
      .min(8, "At least 8 characters")
      .regex(/\d/, "Include at least one number"),
  })
  .refine((d) => d.role !== "business" || d.companyName.trim().length > 0, {
    message: "Company name is required for a business",
    path: ["companyName"],
  });

export type ProvisionUserValues = z.infer<typeof provisionUserSchema>;

export type ProvisionResult =
  | { success: true }
  | { success: false; error?: string; fieldErrors?: Record<string, string> };
