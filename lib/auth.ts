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

// The current user joined with our DB row (role + password-change flag).
// Returns null if not signed in or no DB row exists. Used by role layouts to
// gate access and force the first-login password change.
export async function getCurrentDbUser() {
  const user = await getCurrentUser();
  if (!user) return null;

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true, requiresPasswordChange: true },
  });
  if (!dbUser) return null;

  return {
    id: user.id,
    email: user.email ?? "",
    role: dbUser.role,
    requiresPasswordChange: dbUser.requiresPasswordChange,
  };
}

// Where each role lands after auth.
export function getDashboardPath(role: Role): string {
  switch (role) {
    case "candidate":
      return "/candidate/dashboard";
    case "business":
      return "/business/dashboard";
    case "admin":
      return "/admin/dashboard";
  }
}

// The Company owned by the current business user (or null).
export async function getCurrentCompany() {
  const user = await getCurrentUser();
  if (!user) return null;
  return prisma.company.findUnique({ where: { userId: user.id } });
}

// Authorization gate for the business side: a business may view a candidate's
// profile only if that candidate has applied to at least one of the company's
// jobs.
export async function candidateAppliedToCompany(
  companyId: string,
  candidateProfileId: string
): Promise<boolean> {
  const count = await prisma.application.count({
    where: { candidateProfileId, job: { companyId } },
  });
  return count > 0;
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
