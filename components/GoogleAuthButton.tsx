"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

// Triggers Supabase Google OAuth. The intended role (for brand-new signups) is
// carried to the callback via the redirect URL's `role` query param.
//
// NOTE: signInWithOAuth has no arbitrary `data` payload (that exists only on
// email signUp), so we pass role through redirectTo — the most reliable way to
// read it after the OAuth round-trip. Existing users ignore it (role read from DB).
export function GoogleAuthButton({
  role,
  label = "Continue with Google",
}: {
  role?: "candidate" | "business";
  label?: string;
}) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const supabase = createClient();

    const params = new URLSearchParams();
    if (role) params.set("role", role);
    const query = params.toString();

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback${
          query ? `?${query}` : ""
        }`,
      },
    });

    if (error) {
      setLoading(false);
      toast.error("Could not start Google sign-in. Please try again.");
    }
    // On success the browser is redirected to Google, so no further UI needed.
  }

  return (
    <Button
      onClick={handleClick}
      disabled={loading}
      size="lg"
      className="w-full"
    >
      <GoogleIcon />
      {loading ? "Redirecting…" : label}
    </Button>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12.24 10.4v3.36h5.66c-.23 1.47-1.7 4.3-5.66 4.3-3.41 0-6.19-2.82-6.19-6.3s2.78-6.3 6.19-6.3c1.94 0 3.24.83 3.99 1.54l2.72-2.62C17.2 2.2 14.97 1.2 12.24 1.2 6.97 1.2 2.7 5.47 2.7 10.76s4.27 9.56 9.54 9.56c5.51 0 9.16-3.87 9.16-9.32 0-.63-.07-1.1-.16-1.6z"
      />
    </svg>
  );
}
