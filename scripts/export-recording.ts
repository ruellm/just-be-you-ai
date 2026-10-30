/**
 * Pull an interview recording out of Storage for the team.
 *
 *   npx tsx scripts/export-recording.ts <applicationId>
 *     lists that application's recordings (id, startedAt, status, partCount)
 *
 *   npx tsx scripts/export-recording.ts <applicationId> <recordingId>
 *     downloads every part in order and joins them into
 *     ./exports/{applicationId}-{recordingId}.{webm|mp4}
 *
 * Parts are joined byte for byte, which is how MediaRecorder output is meant
 * to be reassembled. Fails clearly if the recording has been deleted.
 */

import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

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

const LIST_PAGE = 1000;

async function main() {
  const [applicationId, recordingId] = process.argv.slice(2);
  if (!applicationId) {
    console.error("Usage: npx tsx scripts/export-recording.ts <applicationId> [recordingId]");
    process.exit(1);
  }

  const { prisma } = await import("../lib/db");
  const { createAdminClient } = await import("../lib/supabase/admin");
  const { RECORDINGS_BUCKET, extensionForMimeType } = await import(
    "../lib/recording/storage"
  );

  try {
    if (!recordingId) {
      const rows = await prisma.interviewRecording.findMany({
        where: { applicationId },
        orderBy: { startedAt: "asc" },
        select: { id: true, startedAt: true, status: true, partCount: true },
      });
      if (rows.length === 0) {
        console.log(`No recordings for application ${applicationId}.`);
        return;
      }
      for (const row of rows) {
        console.log(
          `${row.id}  ${row.startedAt.toISOString()}  ${row.status}  ${row.partCount} part(s)`
        );
      }
      return;
    }

    const recording = await prisma.interviewRecording.findFirst({
      where: { id: recordingId, applicationId },
    });
    if (!recording) {
      console.error(`Recording ${recordingId} not found for application ${applicationId}.`);
      process.exit(1);
    }
    if (recording.status === "deleted") {
      console.error(
        `Recording ${recordingId} was deleted on ${recording.deletedAt?.toISOString() ?? "an unknown date"}; nothing to export.`
      );
      process.exit(1);
    }

    const bucket = createAdminClient().storage.from(RECORDINGS_BUCKET);
    const { data: objects, error } = await bucket.list(recording.storagePrefix, {
      limit: LIST_PAGE,
    });
    if (error) throw error;
    const partNames = (objects ?? [])
      .map((o) => o.name)
      .filter((name) => name.startsWith("part-"))
      .sort();
    if (partNames.length === 0) {
      console.error(`Recording ${recordingId} has no parts in Storage.`);
      process.exit(1);
    }

    const chunks: Buffer[] = [];
    for (const name of partNames) {
      const objectPath = `${recording.storagePrefix}/${name}`;
      const { data, error: downloadError } = await bucket.download(objectPath);
      if (downloadError || !data) {
        throw new Error(`Download failed for ${objectPath}: ${downloadError?.message ?? "no data"}`);
      }
      chunks.push(Buffer.from(await data.arrayBuffer()));
      console.log(`downloaded ${name}`);
    }

    const outDir = path.resolve("exports");
    await mkdir(outDir, { recursive: true });
    const outFile = path.join(
      outDir,
      `${applicationId}-${recordingId}.${extensionForMimeType(recording.mimeType)}`
    );
    await writeFile(outFile, Buffer.concat(chunks));
    console.log(
      `Wrote ${outFile} (${partNames.length} part(s), ${recording.status}${
        recording.status !== "complete" ? ", may be truncated" : ""
      })`
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
