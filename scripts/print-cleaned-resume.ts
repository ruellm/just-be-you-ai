/**
 * Compare the raw parsed resume text against the Claude-cleaned output for one
 * application, to eyeball exactly what got stripped:
 *
 *   npx tsx scripts/print-cleaned-resume.ts <applicationId>
 *
 * Prints the raw parsedResumeText, then runs cleanResumeText LIVE (a real
 * Claude call — it does NOT read the stored cleanedResumeText, though the
 * stored value's status is noted). Temporary debug tool — safe to delete.
 */

import { existsSync } from "node:fs";

// Load env without a dotenv dependency (.env.local overrides .env), same
// pattern as print-interview-prompt.ts: synchronously, BEFORE main()'s dynamic
// imports, so PrismaClient picks up DATABASE_URL.
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

function banner(title: string): string {
  const bar = "═".repeat(70);
  return `\n${bar}\n  ${title}\n${bar}\n`;
}

async function main() {
  const applicationId = process.argv[2];
  if (!applicationId) {
    console.error(
      "Usage: npx tsx scripts/print-cleaned-resume.ts <applicationId>"
    );
    process.exit(1);
  }

  // Imported here (not top-level) so env is loaded first — see above.
  const { prisma } = await import("../lib/db");
  const { cleanResumeText } = await import("../lib/ai/clean-resume");

  try {
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      select: {
        candidateProfile: {
          select: {
            parsedResumeText: true,
            cleanedResumeText: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
    if (!application) {
      console.error(`Application ${applicationId} not found.`);
      process.exit(1);
    }

    const raw = application.candidateProfile.parsedResumeText;
    if (!raw) {
      console.error(
        "This application's candidate has no parsedResumeText — nothing to clean."
      );
      process.exit(1);
    }

    process.stdout.write(banner(`RAW parsedResumeText (${raw.length} chars)`));
    process.stdout.write(raw + "\n");

    const stored = application.candidateProfile.cleanedResumeText;
    console.error(
      stored
        ? `\n[stored cleanedResumeText exists: ${stored.length} chars — output below is a FRESH clean, not the stored value]`
        : "\n[no stored cleanedResumeText yet]"
    );
    // Same name anchor the Apply action passes.
    const { firstName, lastName } = application.candidateProfile;
    const candidateName =
      [firstName, lastName].filter(Boolean).join(" ") || null;
    console.error(
      `[cleaning via Claude… candidate name anchor: ${candidateName ?? "(none)"}]`
    );

    const cleaned = await cleanResumeText(raw, candidateName);
    process.stdout.write(
      banner(`CLEANED cleanResumeText output (${cleaned.length} chars)`)
    );
    process.stdout.write(cleaned + "\n");

    if (cleaned === raw) {
      console.error(
        "\n[WARNING: output is identical to the raw text — cleanup failed open (check ANTHROPIC_API_KEY / error above)]"
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
