/**
 * Backfill the resume-vs-job match (Application.matchPercent / matchJson /
 * matchedAt) for applications that have none yet. One Claude call per
 * application, run one at a time.
 *
 *   npx tsx scripts/backfill-application-match.ts
 *
 * Safe to re-run: only rows with matchPercent null are selected, and
 * computeApplicationMatch skips rows it already filled. Applications whose
 * candidate has no resume text are skipped and stay null.
 */

import { existsSync } from "node:fs";

// Load env without a dotenv dependency (.env.local overrides .env), before
// main()'s dynamic imports so Prisma and Anthropic pick up their keys.
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

// Pause between Claude calls so a large backlog doesn't hammer the API.
const DELAY_MS = 1500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const { prisma } = await import("../lib/db");
  const { computeApplicationMatch } = await import("../lib/match/compute-match");

  try {
    const applications = await prisma.application.findMany({
      where: { matchPercent: null },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        job: { select: { title: true } },
        candidateProfile: { select: { firstName: true, lastName: true } },
      },
    });
    console.log(`Found ${applications.length} application(s) without a match.`);

    const counts = { computed: 0, skipped: 0, failed: 0 };
    let index = 0;
    for (const app of applications) {
      index += 1;
      const who =
        [app.candidateProfile.firstName, app.candidateProfile.lastName]
          .filter(Boolean)
          .join(" ") || "(no name)";
      const label = `[${index}/${applications.length}] ${app.id} ${who} -> ${app.job.title}`;
      try {
        const outcome = await computeApplicationMatch(app.id);
        if (outcome === "computed") {
          const row = await prisma.application.findUnique({
            where: { id: app.id },
            select: { matchPercent: true },
          });
          counts.computed += 1;
          console.log(`${label}: ${row?.matchPercent ?? "?"}% match`);
          await sleep(DELAY_MS);
        } else {
          counts.skipped += 1;
          console.log(`${label}: skipped (${outcome.replace("skipped_", "")})`);
        }
      } catch (error) {
        counts.failed += 1;
        console.error(
          `${label}: FAILED -`,
          error instanceof Error ? error.message : error
        );
      }
    }

    console.log(
      `Done. ${counts.computed} computed, ${counts.skipped} skipped, ${counts.failed} failed.`
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
