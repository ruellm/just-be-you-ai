// Phase 3.4 — grade an ADVANCED (ElevenLabs) interview. The TypeScript twin of
// the Python save path (voice-agent/lib/save_result.py#save_interview_result):
// fetch the transcript, run the same Claude fit evaluation the basic tier
// runs, write the InterviewResult row (delete-then-insert idempotency), and
// transition the application to passed/failed from `evaluation.passed`.
//
// Failure contract (mirrors the brief + the Python side):
//   * Transcript not ready / any error → log and return. The application stays
//     at interview_completed, so the result page keeps showing its pending
//     state and its poll re-triggers grading via ensureAdvancedGraded.
//   * The evaluation itself never throws — evaluateInterview degrades to the
//     same neutral fallback the Python side uses, so once we HAVE a
//     transcript, a row is always written.
//   * The row insert + status flip run in one transaction — no partial writes.
//
// Idempotent + re-entrant: an existing InterviewResult row is a no-op, and an
// in-process in-flight guard stops the detached completion-triggered run and
// the result-page poll (every 2s!) from grading the same application twice
// concurrently. (This runs on a persistent Node/PM2 server, so module state
// lives long enough to be a real lock.)

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { loadInterviewApplication } from "@/lib/ai/load-interview-context";
import { evaluateInterview } from "@/lib/ai/evaluate-interview";
import {
  fetchConversationTranscript,
  TranscriptNotReadyError,
} from "@/lib/elevenlabs/fetch-transcript";

const inFlight = new Set<string>();

/**
 * Grade one advanced interview end-to-end. Never throws; safe to call
 * repeatedly (no-ops if a result row already exists or a grade is in flight).
 */
export async function gradeAdvancedInterview(applicationId: string): Promise<void> {
  if (inFlight.has(applicationId)) return;
  inFlight.add(applicationId);
  try {
    await grade(applicationId);
  } catch (error) {
    if (error instanceof TranscriptNotReadyError) {
      // Not a failure — ElevenLabs is still processing. The poll retries.
      console.warn(`[advanced-grading] ${error.message} Will retry via poll.`);
    } else {
      console.error(
        `[advanced-grading] Grading failed for application ${applicationId}:`,
        error
      );
    }
  } finally {
    inFlight.delete(applicationId);
  }
}

async function grade(applicationId: string): Promise<void> {
  // Already graded → no-op (idempotent).
  const existing = await prisma.interviewResult.findUnique({
    where: { applicationId },
    select: { id: true },
  });
  if (existing) return;

  // Same loader the interview prompt builder uses, so basic and advanced
  // grade on identical job + candidate context.
  const application = await loadInterviewApplication(applicationId);
  if (!application) {
    console.error(`[advanced-grading] Application ${applicationId} not found.`);
    return;
  }
  if (!application.voiceConversationId) {
    console.error(
      `[advanced-grading] Application ${applicationId} has no voiceConversationId; cannot fetch transcript.`
    );
    return;
  }

  // One request returns both — no second API call for the duration.
  const { transcript, durationSeconds } = await fetchConversationTranscript(
    application.voiceConversationId
  );

  // Never throws — falls back internally (same contract as the Python side).
  // The advanced path has no note_fit_signal tool, so fit signals are [].
  const evaluation = await evaluateInterview(application, transcript);

  // Mirrors save_interview_result: clear any prior row (applicationId is
  // UNIQUE; re-tests must not hit the constraint), insert the new one, then
  // set the application status from the evaluation's `passed` flag —
  // atomically, so an error leaves no partial row behind.
  await prisma.$transaction([
    prisma.interviewResult.deleteMany({ where: { applicationId } }),
    prisma.interviewResult.create({
      data: {
        applicationId,
        score: evaluation.fit_score,
        tier: evaluation.tier,
        transcript,
        completedAt: new Date(),
        durationSeconds,
        passed: evaluation.passed,
        fitSummary: evaluation.fit_summary,
        strengthsJson: evaluation.strengths,
        concernsJson: evaluation.concerns,
        recommendation: evaluation.recommendation,
        fitSignalsJson: [],
        // Rubric fields — null (column default) when the evaluation fell back,
        // so a null rubricScoresJson marks "not rubric-scored" downstream.
        rubricScoresJson: evaluation.rubric_scores_json
          ? (evaluation.rubric_scores_json as Prisma.InputJsonValue)
          : undefined,
        compositeScore: evaluation.composite_score,
        verdict: evaluation.verdict,
        gatesFiredJson: evaluation.gates_fired
          ? (evaluation.gates_fired as unknown as Prisma.InputJsonValue)
          : undefined,
      },
    }),
    prisma.application.update({
      where: { id: applicationId },
      data: { status: evaluation.passed ? "passed" : "failed" },
    }),
  ]);

  console.log(
    `[advanced-grading] Interview saved for application ${applicationId} ` +
      `(composite=${evaluation.composite_score ?? "n/a"}, verdict=${evaluation.verdict ?? "n/a"}, ` +
      `gates=${evaluation.gates_fired?.length ?? 0}, tier=${evaluation.tier}, ` +
      `${evaluation.passed ? "passed" : "failed"}, rec=${evaluation.recommendation}, ` +
      `${evaluation.strengths.length} strengths, ${evaluation.concerns.length} concerns)`
  );
}
