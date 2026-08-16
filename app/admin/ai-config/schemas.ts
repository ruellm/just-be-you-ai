import { z } from "zod";

export const VERTICALS = [
  "IT",
  "Healthcare",
  "BPO",
  "Skilled Trades",
  "General",
] as const;

export const DESCRIPTION_MAX = 300;

export const questionSetSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(150),
  vertical: z.enum(VERTICALS),
  description: z.string().trim().max(DESCRIPTION_MAX),
  // Blank rows are dropped server-side, so text has no min here.
  questions: z.array(z.object({ text: z.string().max(1000) })).max(50),
});

export type QuestionSetValues = z.infer<typeof questionSetSchema>;

export type ActionResult =
  | { success: true }
  | { success: false; error?: string; fieldErrors?: Record<string, string> };
