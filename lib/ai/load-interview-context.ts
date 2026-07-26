// Loads everything the ADVANCED-path interview system prompt needs for one
// application (see lib/ai/build-interview-prompt.ts). Deliberately separate
// from generate-questions.ts#loadApplication — same include shape, plus the
// four things the interview prompt needs that question generation doesn't:
//   1. company name        (job → company)
//   2. user email          (candidateProfile → user; name fallback)
//   3. job.interviewMaxMinutes (comes with the job scalars; listed for clarity)
//   4. the generated questions (Application.questions, ordered)
//
// NOTE: no `import "server-only"` here (unlike generate-questions.ts) — this
// module is also loaded by scripts/print-interview-prompt.ts under plain tsx,
// where that package throws. It still only ever runs server-side (it imports
// the Prisma client).

import { prisma } from "@/lib/db";

export function loadInterviewApplication(applicationId: string) {
  return prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      job: {
        include: {
          skills: { include: { skill: true } },
          company: { select: { name: true } },
        },
      },
      candidateProfile: {
        include: {
          skills: { include: { skill: true } },
          workExperiences: { orderBy: { startDate: "desc" } },
          user: { select: { email: true } },
        },
      },
      questions: { orderBy: { order: "asc" } },
    },
  });
}

export type InterviewApplication = NonNullable<
  Awaited<ReturnType<typeof loadInterviewApplication>>
>;
