import { createClient } from "@supabase/supabase-js";

// Server-ONLY Supabase client using the service-role key. Bypasses Row Level
// Security, so it must never be imported into a Client Component. Used for
// Storage operations (upload / remove / signed URLs) on the private `resumes`
// bucket, which don't depend on per-bucket RLS policies being configured.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
