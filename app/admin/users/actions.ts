"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUserRole } from "@/lib/auth";

const roleSchema = z.enum(["candidate", "business", "admin"]);

type Result = { success: true } | { success: false; error?: string };

export async function changeUserRole(
  userId: string,
  role: string
): Promise<Result> {
  if ((await getCurrentUserRole()) !== "admin") {
    return { success: false, error: "Not authorized." };
  }

  const idParsed = z.string().min(1).safeParse(userId);
  const roleParsed = roleSchema.safeParse(role);
  if (!idParsed.success || !roleParsed.success) {
    return { success: false, error: "Invalid request." };
  }

  await prisma.user.update({
    where: { id: idParsed.data },
    data: { role: roleParsed.data },
  });

  // Keep the role-specific record consistent so the user's section works.
  if (roleParsed.data === "business") {
    await prisma.company.upsert({
      where: { userId: idParsed.data },
      update: {},
      create: { userId: idParsed.data, name: "" },
    });
  } else if (roleParsed.data === "candidate") {
    await prisma.candidateProfile.upsert({
      where: { userId: idParsed.data },
      update: {},
      create: { userId: idParsed.data },
    });
  }

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${idParsed.data}`);
  return { success: true };
}
