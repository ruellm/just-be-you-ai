import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { ensureUserRow, getDashboardPath } from "@/lib/auth";

// OAuth redirect target. This MUST be a Route Handler (it's where Google/Supabase
// send the browser back with a `code`) — the one sanctioned exception to the
// "no API routes" rule. DB provisioning is delegated to ensureUserRow().
//
// Flow:
//   1. Exchange the `code` for a session (sets auth cookies).
//   2. Look up / create our `users` row (+ empty profile or company).
//   3. Redirect to the user's role-based dashboard.

const roleSchema = z.enum(["candidate", "business"]);

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const roleParam = searchParams.get("role");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(
    code
  );
  if (exchangeError) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${origin}/login?error=no_user`);
  }

  // Intended role only matters for brand-new users. If absent/invalid (e.g. a
  // first-time user came through /login), default to candidate. Existing users
  // keep whatever role is already on their DB row.
  const parsedRole = roleSchema.safeParse(roleParam);
  const intendedRole = parsedRole.success ? parsedRole.data : "candidate";

  const dbUser = await ensureUserRow(user, intendedRole);

  return NextResponse.redirect(`${origin}${getDashboardPath(dbUser.role)}`);
}
