/**
 * Print the advanced-path (ElevenLabs) interview system prompt for one
 * application, to eyeball against the Python build_system_prompt output:
 *
 *   npx tsx scripts/print-interview-prompt.ts <applicationId>
 *
 * Temporary debug tool — safe to delete.
 */

import { existsSync } from "node:fs";

// Load env without a dotenv dependency (.env.local overrides .env), same
// pattern as backfill-resume-text.ts: synchronously, BEFORE main()'s dynamic
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

async function main() {
  const applicationId = process.argv[2];
  if (!applicationId) {
    console.error(
      "Usage: npx tsx scripts/print-interview-prompt.ts <applicationId>"
    );
    process.exit(1);
  }

  // Imported here (not top-level) so env is loaded first — see backfill script.
  const { buildInterviewSystemPrompt } = await import(
    "../lib/ai/build-interview-prompt"
  );
  const { prisma } = await import("../lib/db");

  try {
    const prompt = await buildInterviewSystemPrompt(applicationId);
    process.stdout.write(prompt + "\n");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
