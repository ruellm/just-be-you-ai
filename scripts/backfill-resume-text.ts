/**
 * Backfill parsed resume text for candidates who have a resume on file but no
 * extracted text yet. Idempotent (only touches rows where parsedResumeText is
 * null). Run manually AFTER confirming the on-upload parsing works:
 *
 *   npm run backfill:resumes
 *
 * Logs progress per row and continues past individual failures.
 */

import { existsSync } from "node:fs";

// Load env without a dotenv dependency (.env.local overrides .env). Done at the
// top, synchronously, BEFORE main() runs its dynamic imports — so PrismaClient
// and the admin client pick up the right vars. loadEnvFile is guarded since it
// isn't in every @types/node version / Node release.
const loadEnvFile = (process as { loadEnvFile?: (path: string) => void })
  .loadEnvFile;
for (const file of [".env", ".env.local"]) {
  if (loadEnvFile && existsSync(file)) {
    try {
      loadEnvFile(file);
    } catch {
      // ignore unreadable env file
    }
  }
}

const BUCKET = "resumes";

function extOf(path: string): string {
  return path.split(".").pop()?.toLowerCase() ?? "";
}

async function main() {
  // Imported here (not top-level) so env is loaded first and to avoid
  // top-level await, which tsx can't emit in this project's CommonJS mode.
  const { PrismaClient } = await import("@prisma/client");
  const { createAdminClient } = await import("../lib/supabase/admin");
  const { extractResumeText } = await import("../lib/resume-parse");

  const prisma = new PrismaClient();
  const admin = createAdminClient();

  try {
    const profiles = await prisma.candidateProfile.findMany({
      where: { resumeUrl: { not: null }, parsedResumeText: null },
      select: { id: true, userId: true, resumeUrl: true },
    });

    console.log(`Found ${profiles.length} resume(s) needing text extraction.`);

    let index = 0;
    for (const profile of profiles) {
      index += 1;
      const path = profile.resumeUrl as string;
      const label = `[${index}/${profiles.length}] user ${profile.userId}`;
      try {
        const { data, error } = await admin.storage.from(BUCKET).download(path);
        if (error || !data) {
          throw new Error(error?.message ?? "download failed");
        }
        const buffer = Buffer.from(await data.arrayBuffer());
        const text = await extractResumeText(buffer, extOf(path));
        const parsed = text.length > 0 ? text : null;

        await prisma.candidateProfile.update({
          where: { id: profile.id },
          data: {
            parsedResumeText: parsed,
            resumeParsedAt: parsed ? new Date() : null,
          },
        });

        console.log(
          `${label}: ${parsed ? `parsed ${parsed.length} chars` : "no text extracted"}`
        );
      } catch (err) {
        console.error(
          `${label}: FAILED —`,
          err instanceof Error ? err.message : err
        );
      }
    }

    console.log("Backfill complete.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
