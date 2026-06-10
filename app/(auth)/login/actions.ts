"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { getDashboardPath } from "@/lib/auth";

const schema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

// Email/password sign-in for businesses + admins. On success, redirects to
// /change-password (if a first-login password change is pending) or the
// role-based dashboard. Returns an error object on failure.
export async function signInWithPassword(
  email: string,
  password: string
): Promise<{ error: string } | void> {
  const parsed = schema.safeParse({ email, password });
  if (!parsed.success) return { error: "Enter your email and password." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error || !data.user) {
    return { error: "Invalid email or password." };
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: data.user.id },
    select: { role: true, requiresPasswordChange: true },
  });
  if (!dbUser) return { error: "No account found for this user." };

  if (dbUser.requiresPasswordChange) redirect("/change-password");
  redirect(getDashboardPath(dbUser.role));
}
