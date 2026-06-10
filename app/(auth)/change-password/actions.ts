"use server";

import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, getDashboardPath } from "@/lib/auth";
import { fieldErrorsFrom, newPasswordSchema, type NewPasswordValues } from "@/lib/zod";

type Result =
  | { success: true; redirectTo: string }
  | { success: false; error?: string; fieldErrors?: Record<string, string> };

export async function changePassword(
  values: NewPasswordValues
): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "You are not signed in." };

  const parsed = newPasswordSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) {
    return { success: false, error: error.message || "Could not update password." };
  }

  const dbUser = await prisma.user.update({
    where: { id: user.id },
    data: { requiresPasswordChange: false },
    select: { role: true },
  });

  return { success: true, redirectTo: getDashboardPath(dbUser.role) };
}
