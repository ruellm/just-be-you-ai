"use server";

import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { fieldErrorsFrom, newPasswordSchema, type NewPasswordValues } from "@/lib/zod";

type Result =
  | { success: true }
  | { success: false; error?: string; fieldErrors?: Record<string, string> };

export async function resetPassword(values: NewPasswordValues): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Your reset link is invalid or has expired." };
  }

  const parsed = newPasswordSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) {
    return { success: false, error: error.message || "Could not reset password." };
  }

  // A reset means the user has set their own password — clear any pending flag.
  await prisma.user
    .update({ where: { id: user.id }, data: { requiresPasswordChange: false } })
    .catch(() => {});

  await supabase.auth.signOut();
  return { success: true };
}
