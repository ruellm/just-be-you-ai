"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUserRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { fieldErrorsFrom } from "@/lib/zod";
import {
  provisionUserSchema,
  type ProvisionResult,
  type ProvisionUserValues,
} from "./schemas";

// Admin-provisions a business or admin account: creates the Supabase Auth user
// (email pre-confirmed, no verification email) + our User row with
// requiresPasswordChange=true (+ a Company for businesses).
export async function provisionUser(
  values: ProvisionUserValues
): Promise<ProvisionResult> {
  if ((await getCurrentUserRole()) !== "admin") {
    return { success: false, error: "Not authorized." };
  }

  const parsed = provisionUserSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const d = parsed.data;

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email: d.email,
    password: d.password,
    email_confirm: true,
    user_metadata: { full_name: d.fullName },
  });
  if (error || !data.user) {
    if (/already|registered|exists/i.test(error?.message ?? "")) {
      return {
        success: false,
        fieldErrors: { email: "A user with that email already exists." },
      };
    }
    return { success: false, error: "Could not create the auth user." };
  }

  try {
    await prisma.user.create({
      data: {
        id: data.user.id,
        email: d.email,
        role: d.role,
        requiresPasswordChange: true,
        ...(d.role === "business"
          ? { company: { create: { name: d.companyName.trim() } } }
          : {}),
      },
    });
  } catch {
    // Roll back the orphaned auth user if our DB insert fails.
    await admin.auth.admin.deleteUser(data.user.id).catch(() => {});
    return { success: false, error: "Could not create the user record." };
  }

  revalidatePath("/admin/users");
  return { success: true };
}
