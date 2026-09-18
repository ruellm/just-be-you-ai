/**
 * Run the hidden-text detector (lib/resume-hidden-text.ts) over every resume
 * already in Storage and report what it triggers. Use this to judge false
 * positives before touching any threshold.
 *
 *   npx tsx scripts/scan-resume-flags.ts           # report only, no writes
 *   npx tsx scripts/scan-resume-flags.ts --write   # also store the results
 *
 * --write needs migration 20260918000000_add_integrity_flags applied. For each
 * resume it stores resumeFlagsJson; where hidden text was dropped it also
 * replaces parsedResumeText with the visible text and re-runs the cleanup, so
 * text stored before the detector existed stops reaching the models.
 */
import ws from "ws";
(globalThis as any).WebSocket ??= ws;

import { existsSync } from "node:fs";
import type { Prisma } from "@prisma/client";

// Same env loading as backfill-resume-text.ts (before main()'s imports).
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
  const write = process.argv.includes("--write");

  const { PrismaClient } = await import("@prisma/client");
  const { createAdminClient } = await import("../lib/supabase/admin");
  const { extractResume } = await import("../lib/resume-parse");
  const { cleanResumeText } = await import("../lib/ai/clean-resume");

  const prisma = new PrismaClient();
  const admin = createAdminClient();

  try {
    // Explicit select: works whether or not the new column exists yet.
    const profiles = await prisma.candidateProfile.findMany({
      where: { resumeUrl: { not: null } },
      select: {
        id: true,
        resumeUrl: true,
        firstName: true,
        lastName: true,
        parsedResumeText: true,
      },
      orderBy: { id: "asc" },
    });
    console.log(`Scanning ${profiles.length} resume(s)${write ? " (WRITE mode)" : ""}.\n`);

    const bySignature = new Map<string, number>();
    let flagged = 0;
    let failed = 0;

    for (const profile of profiles) {
      const path = profile.resumeUrl as string;
      const label = `profile ${profile.id} (.${extOf(path)})`;
      try {
        const { data, error } = await admin.storage.from(BUCKET).download(path);
        if (error || !data) throw new Error(error?.message ?? "download failed");
        const buffer = Buffer.from(await data.arrayBuffer());
        const { text, flags } = await extractResume(buffer, extOf(path));

        const dropped = flags.filter((f) => f.dropped);
        const before = profile.parsedResumeText?.length ?? 0;
        if (!flags.length) {
          console.log(`${label}: clean (${text.length} chars)`);
        } else {
          flagged += 1;
          console.log(
            `${label}: ${flags.length} flag(s), stored text ${before} -> visible ${text.length} chars`
          );
          for (const f of flags) {
            bySignature.set(f.signature, (bySignature.get(f.signature) ?? 0) + 1);
            console.log(
              `    [${f.signature}] p${f.page ?? "-"} ${f.detail}: ${JSON.stringify(f.text.slice(0, 160))}`
            );
          }
        }

        if (write) {
          const parsed = text.length > 0 ? text : null;
          await prisma.candidateProfile.update({
            where: { id: profile.id },
            data: {
              resumeFlagsJson: flags as unknown as Prisma.InputJsonValue,
              ...(dropped.length
                ? { parsedResumeText: parsed, cleanedResumeText: null }
                : {}),
            },
          });
          if (dropped.length && parsed) {
            const name =
              [profile.firstName, profile.lastName].filter(Boolean).join(" ") || null;
            const cleaned = await cleanResumeText(parsed, name);
            // cleanResumeText fails open to the raw text; never store that.
            if (cleaned !== parsed) {
              await prisma.candidateProfile.update({
                where: { id: profile.id },
                data: { cleanedResumeText: cleaned },
              });
            }
          }
        }
      } catch (err) {
        failed += 1;
        console.error(`${label}: FAILED -`, err instanceof Error ? err.message : err);
      }
    }

    console.log(
      `\nDone: ${profiles.length} scanned, ${flagged} with flags, ${failed} failed.`
    );
    for (const [signature, count] of bySignature) {
      console.log(`  ${signature}: ${count}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
