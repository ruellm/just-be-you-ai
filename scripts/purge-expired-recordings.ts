/**
 * Daily cleanup for interview recordings.
 *
 *   npx tsx scripts/purge-expired-recordings.ts
 *
 * 1. Rows past deleteAfter that are not yet `deleted`: every object under the
 *    row's storagePrefix is removed from the bucket, then the row is marked
 *    `deleted` with deletedAt. The row itself is kept.
 * 2. Rows still `recording` whose startedAt is older than 6 hours (the tab was
 *    closed mid-interview) are marked `incomplete`. Their parts stay until
 *    their own deleteAfter.
 *
 * Prints one line per row and a final count.
 */

import { existsSync } from "node:fs";

// Load env without a dotenv dependency (.env.local overrides .env), before
// main()'s dynamic imports so Prisma and Supabase pick up their keys.
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

const STALE_RECORDING_MS = 6 * 60 * 60 * 1000;
const LIST_PAGE = 1000;

async function main() {
  const { prisma } = await import("../lib/db");
  const { createAdminClient } = await import("../lib/supabase/admin");
  const { RECORDINGS_BUCKET } = await import("../lib/recording/storage");

  const admin = createAdminClient();
  const bucket = admin.storage.from(RECORDINGS_BUCKET);
  const now = new Date();
  const counts = { purged: 0, markedIncomplete: 0, failed: 0 };

  try {
    const expired = await prisma.interviewRecording.findMany({
      where: { deleteAfter: { lt: now }, status: { not: "deleted" } },
      orderBy: { deleteAfter: "asc" },
      select: { id: true, applicationId: true, storagePrefix: true, status: true },
    });
    console.log(`Found ${expired.length} expired recording(s).`);

    for (const row of expired) {
      const label = `purge ${row.id} (application ${row.applicationId}, ${row.status})`;
      try {
        const { data: objects, error } = await bucket.list(row.storagePrefix, {
          limit: LIST_PAGE,
        });
        if (error) throw error;
        const paths = (objects ?? []).map((o) => `${row.storagePrefix}/${o.name}`);
        if (paths.length > 0) {
          const { error: removeError } = await bucket.remove(paths);
          if (removeError) throw removeError;
        }
        await prisma.interviewRecording.update({
          where: { id: row.id },
          data: { status: "deleted", deletedAt: new Date() },
        });
        counts.purged += 1;
        console.log(`${label}: removed ${paths.length} object(s)`);
      } catch (error) {
        counts.failed += 1;
        console.error(`${label}: FAILED -`, error instanceof Error ? error.message : error);
      }
    }

    const stale = await prisma.interviewRecording.findMany({
      where: {
        status: "recording",
        startedAt: { lt: new Date(now.getTime() - STALE_RECORDING_MS) },
      },
      select: { id: true, applicationId: true, startedAt: true },
    });
    console.log(`Found ${stale.length} stale recording(s) still marked recording.`);

    for (const row of stale) {
      const label = `stale ${row.id} (application ${row.applicationId}, started ${row.startedAt.toISOString()})`;
      try {
        await prisma.interviewRecording.update({
          where: { id: row.id },
          data: { status: "incomplete", endedAt: new Date() },
        });
        counts.markedIncomplete += 1;
        console.log(`${label}: marked incomplete`);
      } catch (error) {
        counts.failed += 1;
        console.error(`${label}: FAILED -`, error instanceof Error ? error.message : error);
      }
    }

    console.log(
      `Done. ${counts.purged} purged, ${counts.markedIncomplete} marked incomplete, ${counts.failed} failed.`
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
