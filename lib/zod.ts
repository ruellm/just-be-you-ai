import { z } from "zod";

// Shared "set a new password" schema (change-password + reset-password).
export const newPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "At least 8 characters")
      .regex(/\d/, "Include at least one number"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords don't match",
    path: ["confirm"],
  });

export type NewPasswordValues = z.infer<typeof newPasswordSchema>;

// Flatten a ZodError into a { fieldName: firstMessage } map for client forms.
export function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !(key in out)) {
      out[key] = issue.message;
    }
  }
  return out;
}
