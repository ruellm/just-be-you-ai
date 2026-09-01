// Pure, client-safe profile helpers (no auth / Prisma / next/headers imports).
// Safe to import from client components. Server-only helpers live in
// lib/profile.ts.

// Which image to show for a candidate, everywhere one is rendered:
//   1. profileImageUrl — the user's own choice ("Edit Profile Image" modal)
//   2. avatarUrl       — the Google picture, overwritten on every sign-in by
//                        ensureUserRow, so it can never hold a user-set value
//   3. null            — caller falls back to initials (AvatarFallback)
// Blank/whitespace strings count as "not set" so an empty column never beats
// a real Google picture.
export function displayAvatarUrl(
  profileImageUrl: string | null | undefined,
  avatarUrl: string | null | undefined
): string | null {
  return profileImageUrl?.trim() || avatarUrl?.trim() || null;
}

// Date <-> <input type="date"> string ("YYYY-MM-DD").
export function dateToInput(date: Date | null | undefined): string {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

export function toDateOrNull(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date;
}

// resumeUrl is the storage path: `{userId}/{timestamp}-{originalFilename}`.
// Derive the display filename + upload date from it (no extra DB columns).
export function parseResumeMeta(path: string | null): {
  filename: string;
  uploadedAt: string | null;
} | null {
  if (!path) return null;
  const base = path.split("/").pop() ?? path;
  const dash = base.indexOf("-");
  if (dash === -1) return { filename: base, uploadedAt: null };
  const ts = Number(base.slice(0, dash));
  const filename = base.slice(dash + 1);
  const uploadedAt =
    Number.isFinite(ts) && ts > 0 ? new Date(ts).toISOString() : null;
  return { filename, uploadedAt };
}

// "YYYY-MM-DD" -> "August 2021" (display only; profile entry rows).
export function monthYear(iso: string): string {
  if (!iso) return "";
  const [y, m] = iso.split("-").map(Number);
  if (!y || !m) return iso.slice(0, 7);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

// "August 2021 - July 2026" / "July 2026 - Present" / "".
export function displayDateRange(
  start: string,
  end: string,
  present: boolean
): string {
  const s = monthYear(start);
  const e = present ? "Present" : monthYear(end);
  if (!s && !e) return "";
  return [s, e].filter(Boolean).join(" - ");
}
