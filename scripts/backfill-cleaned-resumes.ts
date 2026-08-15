/**
 * One-time backfill: run the resume PII cleanup (cleanResumeText) for every
 * candidate who uploaded a resume BEFORE cleanup ran on upload, i.e. rows with
 * parsedResumeText but cleanedResumeText still null.
 *
 *   npx tsx scripts/backfill-cleaned-resumes.ts            # real run
 *   npx tsx scripts/backfill-cleaned-resumes.ts --dry-run  # count/list only, no API calls, no writes
 *
 * Idempotent / safe to re-run: only rows where cleanedResumeText IS NULL are
 * selected, so already-backfilled rows are never touched and a re-run just
 * picks up whatever failed last time.
 *
 * Fail-open handling: cleanResumeText returns the RAW text unchanged on any
 * error (its fail-open contract — no explicit signal). We detect that by
 * comparing output === input (same check print-cleaned-resume.ts uses) and
 * SKIP the write in that case — raw unredacted text is never stored in
 * cleanedResumeText as if it were cleaned. Those rows stay null for a retry.
 */

import { existsSync } from "node:fs";

// Load env without a dotenv dependency (.env.local overrides .env), same
// pattern as backfill-resume-text.ts: synchronously, BEFORE main()'s dynamic
// imports, so PrismaClient/Anthropic pick up DATABASE_URL/ANTHROPIC_API_KEY.
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

// Pause between Claude calls so a large user base doesn't hammer the API.
const DELAY_MS = 2000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  // Imported here (not top-level) so env is loaded first — see above.
  const { prisma } = await import("../lib/db");
  const { cleanResumeText } = await import("../lib/ai/clean-resume");

  try {
    // Rows needing backfill: have parsed text, no cleaned text yet.
    const profiles = await prisma.candidateProfile.findMany({
      where: {
        parsedResumeText: { not: null },
        NOT: { parsedResumeText: "" },
        cleanedResumeText: null,
      },
      select: {
        id: true,
        userId: true,
        firstName: true,
        lastName: true,
        parsedResumeText: true,
      },
      orderBy: { id: "asc" },
    });

    // For the summary: rows already cleaned (untouched by this run).
    const alreadyCleaned = await prisma.candidateProfile.count({
      where: {
        parsedResumeText: { not: null },
        NOT: { parsedResumeText: "" },
        cleanedResumeText: { not: null },
      },
    });

    console.log(
      `Found ${profiles.length} profile(s) needing cleanup backfill ` +
        `(${alreadyCleaned} already have cleanedResumeText and will be untouched).`
    );

    if (dryRun) {
      for (const p of profiles) {
        const name = [p.firstName, p.lastName].filter(Boolean).join(" ") || "(no name)";
        console.log(
          `  would clean: profile ${p.id} — ${name} — ${p.parsedResumeText!.length} chars`
        );
      }
      console.log("Dry run — no API calls, no writes.");
      return;
    }

    let succeeded = 0;
    let skippedFailed = 0;

    for (let i = 0; i < profiles.length; i++) {
      const profile = profiles[i];
      const raw = profile.parsedResumeText!;
      const label = `[${i + 1}/${profiles.length}] profile ${profile.id} (user ${profile.userId})`;

      try {
        // Same name anchor the upload path builds.
        const candidateName =
          [profile.firstName, profile.lastName].filter(Boolean).join(" ") ||
          null;

        const cleaned = await cleanResumeText(raw, candidateName);

        // Fail-open detection: cleanResumeText returns the raw text unchanged
        // on any error. Never store that as "cleaned" — skip so a re-run
        // retries this row.
        if (cleaned === raw) {
          skippedFailed += 1;
          console.error(
            `${label}: SKIPPED — cleanup failed open (output identical to raw); left null for retry`
          );
        } else {
          await prisma.candidateProfile.update({
            where: { id: profile.id },
            data: { cleanedResumeText: cleaned },
          });
          succeeded += 1;
          console.log(
            `${label}: cleaned ${raw.length} → ${cleaned.length} chars`
          );
        }
      } catch (err) {
        // e.g. the DB write failed; the row stays null so a re-run retries it.
        skippedFailed += 1;
        console.error(
          `${label}: FAILED —`,
          err instanceof Error ? err.message : err
        );
      }

      if (i < profiles.length - 1) await sleep(DELAY_MS);
    }

    console.log(
      `\nBackfill complete: ${succeeded} succeeded, ${skippedFailed} skipped/failed ` +
        `(re-run to retry), ${alreadyCleaned} already cleaned (untouched).`
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
