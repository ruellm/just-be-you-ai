/**
 * Run the FULL rubric evaluation (Claude scoring + deterministic decision
 * engine, TS path) against an application that already has a completed
 * interview, and pretty-print the breakdown to eyeball scoring quality:
 *
 *   npx tsx scripts/print-rubric-eval.ts <applicationId>
 *
 * Reads the stored transcript + fit signals from the existing InterviewResult
 * row and re-grades LIVE (a real Claude call). Nothing is written to the DB.
 * Temporary debug tool — safe to delete.
 */

import { existsSync } from "node:fs";

// Load env without a dotenv dependency (.env.local overrides .env), same
// pattern as print-cleaned-resume.ts: synchronously, BEFORE main()'s dynamic
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
    console.error("Usage: npx tsx scripts/print-rubric-eval.ts <applicationId>");
    process.exit(1);
  }

  // Imported here (not top-level) so env is loaded first — see above.
  const { prisma } = await import("../lib/db");
  const { loadInterviewApplication } = await import(
    "../lib/ai/load-interview-context"
  );
  const { evaluateInterview } = await import("../lib/ai/evaluate-interview");
  const { RUBRIC, resolveMustHaveKeys, resolvePassingBar } = await import(
    "../lib/ai/rubric"
  );

  try {
    const application = await loadInterviewApplication(applicationId);
    if (!application) {
      console.error(`Application ${applicationId} not found.`);
      process.exit(1);
    }

    const result = await prisma.interviewResult.findUnique({
      where: { applicationId },
      select: { transcript: true, fitSignalsJson: true },
    });
    if (!result || !result.transcript) {
      console.error(
        "This application has no completed interview (no InterviewResult " +
          "with a transcript) — nothing to grade."
      );
      process.exit(1);
    }
    const fitSignals = Array.isArray(result.fitSignalsJson)
      ? (result.fitSignalsJson as Array<Record<string, unknown>>)
      : [];

    console.error(
      `[job: "${application.job.title}" @ ${application.job.company.name} | ` +
        `bar=${resolvePassingBar(application.job.passingBar)} | ` +
        `must-have=${resolveMustHaveKeys(application.job.mustHaveCriteriaJson).join(", ")} | ` +
        `transcript ${result.transcript.length} chars, ${fitSignals.length} fit signals]`
    );
    console.error("[grading via Claude — this is a live call…]");

    const evaluation = await evaluateInterview(
      application,
      result.transcript,
      fitSignals as never[]
    );

    if (!evaluation.rubric_scores_json) {
      console.error(
        "\nEvaluation FELL BACK (no rubric scores) — check ANTHROPIC_API_KEY " +
          "or the warnings above. Legacy fallback fields:"
      );
      console.error(JSON.stringify(evaluation, null, 2));
      process.exit(1);
    }

    const breakdown = evaluation.rubric_scores_json as {
      passingBar: string;
      verdictBeforeGates: string;
      categories: Array<{
        key: string;
        displayName: string;
        weightPercent: number;
        categoryScore: number;
        subCriteria: Array<{
          key: string;
          displayName: string;
          score: number;
          evidence: string | null;
        }>;
      }>;
    };

    process.stdout.write(banner("PER-CRITERION SCORES"));
    for (const cat of breakdown.categories) {
      process.stdout.write(
        `\n${cat.displayName}  (${cat.weightPercent}%)  →  category score ` +
          `${cat.categoryScore.toFixed(2)} / 5\n`
      );
      for (const sub of cat.subCriteria) {
        process.stdout.write(`  [${sub.score}/5] ${sub.displayName}\n`);
        process.stdout.write(
          sub.evidence
            ? `        "${sub.evidence}"\n`
            : "        (no evidence in transcript)\n"
        );
      }
    }

    process.stdout.write(banner("DECISION"));
    process.stdout.write(
      `Rubric:            ${RUBRIC.displayName} (v${RUBRIC.version})\n` +
        `Passing bar:       ${breakdown.passingBar}\n` +
        `Composite:         ${evaluation.composite_score} / 100\n` +
        `Verdict (banded):  ${breakdown.verdictBeforeGates}\n` +
        `Verdict (final):   ${evaluation.verdict}\n` +
        `Gates fired:       ${
          evaluation.gates_fired && evaluation.gates_fired.length
            ? JSON.stringify(evaluation.gates_fired, null, 2)
            : "(none)"
        }\n` +
        `Legacy mapping:    passed=${evaluation.passed}, tier=${evaluation.tier}, ` +
        `score=${evaluation.fit_score}\n` +
        `Recommendation:    ${evaluation.recommendation}\n` +
        `Manipulation:      ${
          evaluation.manipulation_attempts && evaluation.manipulation_attempts.length
            ? JSON.stringify(evaluation.manipulation_attempts, null, 2)
            : "(none)"
        }\n`
    );

    process.stdout.write(banner("FIT SUMMARY"));
    process.stdout.write(evaluation.fit_summary + "\n");
    if (evaluation.strengths.length) {
      process.stdout.write("\nStrengths:\n");
      for (const s of evaluation.strengths) {
        process.stdout.write(`  + [${s.dimension}] ${s.evidence}\n`);
      }
    }
    if (evaluation.concerns.length) {
      process.stdout.write("\nConcerns:\n");
      for (const c of evaluation.concerns) {
        process.stdout.write(`  - [${c.dimension}] ${c.evidence}\n`);
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
