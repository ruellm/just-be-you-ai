"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Sign the current user out and send them to the landing page.
// Server action (called from a <form action={signOut}>), so it can clear the
// auth cookies on the server before redirecting.
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
