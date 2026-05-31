import type { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

// Read-only auth helpers. No mutations here — sign-in/sign-up come in Step 3.

// The authenticated Supabase auth user, or null. Prefer this over getSession()
// for auth checks: getUser() revalidates the token with the Supabase server,
// whereas the session is read straight from the cookie.
export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

// The raw session (access/refresh tokens). Cookie-read, not server-validated —
// use getCurrentUser() when you need to trust the identity.
export async function getSession() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

// The current user's role from our own `users` table, keyed by the Supabase
// Auth UUID. Returns null if not signed in or no row exists yet.
export async function getCurrentUserRole(): Promise<Role | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true },
  });

  return dbUser?.role ?? null;
}

// Where each role lands after auth.
export function getDashboardPath(role: Role): string {
  switch (role) {
    case "candidate":
      return "/candidate/dashboard";
    case "business":
      return "/business/dashboard";
    case "admin":
      return "/admin/users";
  }
}

// Ensure a `users` row exists for a freshly-authenticated Supabase user.
// First-time sign-ins also get an empty CandidateProfile (candidate) or an
// empty Company (business) so later steps have something to fill in.
// Idempotent: if the row already exists we just return it (handles the
// "tried to sign up but already has an account" case → treated as a login).
export async function ensureUserRow(
  authUser: { id: string; email?: string | null },
  intendedRole: Role
) {
  const existing = await prisma.user.findUnique({ where: { id: authUser.id } });
  if (existing) return existing;

  return prisma.user.create({
    data: {
      id: authUser.id,
      email: authUser.email ?? "",
      role: intendedRole,
      ...(intendedRole === "candidate"
        ? { candidateProfile: { create: {} } }
        : {}),
      ...(intendedRole === "business"
        ? { company: { create: { name: "" } } }
        : {}),
    },
  });
}
