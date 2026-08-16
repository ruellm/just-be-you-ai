import type { Prisma, PrismaClient } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

export const OUT_OF_SEATS_MESSAGE =
  "You're out of interview seats. Each application uses one seat, and you have none remaining.";
export const OUT_OF_SEATS_SHORT = "You're out of interview seats.";

export type InterviewSeatBalance = {
  used: number;
  total: number;
  remaining: number;
};

export function interviewSeatsUsedWhere(
  candidateProfileId: string
): Prisma.ApplicationWhereInput {
  return {
    candidateProfileId,
    NOT: {
      status: { in: ["draft", "submitted"] },
      interviewResult: null,
      voiceConversationId: null,
      job: { status: "closed" },
    },
  };
}

export async function countInterviewSeatsUsed(
  db: Db,
  candidateProfileId: string
): Promise<number> {
  return db.application.count({
    where: interviewSeatsUsedWhere(candidateProfileId),
  });
}

export async function getInterviewSeatBalance(
  db: Db,
  candidateProfileId: string
): Promise<InterviewSeatBalance> {
  const [used, profile] = await Promise.all([
    countInterviewSeatsUsed(db, candidateProfileId),
    db.candidateProfile.findUnique({
      where: { id: candidateProfileId },
      select: { interviewSeatsTotal: true },
    }),
  ]);
  const total = profile?.interviewSeatsTotal ?? 0;
  return { used, total, remaining: Math.max(0, total - used) };
}

export function clampSeatsUsedForDisplay(used: number, total: number): number {
  return Math.min(Math.max(0, used), Math.max(0, total));
}
