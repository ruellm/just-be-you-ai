"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const emailSchema = z.string().trim().email();

// Sends a reset link. Returns a generic success regardless of whether the
// email is registered (so we don't leak account existence). The reset link
// routes through /auth/callback, which exchanges the code then forwards to
// /reset-password with an active recovery session.
export async function requestPasswordReset(
  email: string,
  origin: string
): Promise<{ success: true } | { error: string }> {
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) return { error: "Enter a valid email address." };

  const safeOrigin = /^https?:\/\//.test(origin) ? origin : "";
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${safeOrigin}/auth/callback?next=/reset-password`,
  });

  return { success: true };
}
