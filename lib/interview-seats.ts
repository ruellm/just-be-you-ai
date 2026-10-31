import type { Prisma, PrismaClient } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

export const OUT_OF_SEATS_MESSAGE =
  "You're out of interview seats. Each application uses one seat, and you have none remaining.";
export const OUT_OF_SEATS_SHORT = "You're out of interview seats.";
export const CANDIDATE_SEAT_INFO =
  "Candidates spend one seat each time they apply to a job.";
export const COMPANY_SEAT_INFO =
  "Companies spend one seat each time they unlock a candidate profile.";

export type SeatBalance = {
  trueUsed: number;
  adjustment: number;
  used: number;
  total: number;
  remaining: number;
};

export type InterviewSeatBalance = SeatBalance;

export function effectiveSeatsUsed(trueUsed: number, adjustment: number): number {
  return Math.max(0, trueUsed + adjustment);
}

export function seatsRemaining(used: number, total: number): number {
  return Math.max(0, total - used);
}

export function deriveSeatBalance(
  trueUsed: number,
  adjustment: number,
  total: number
): SeatBalance {
  const used = effectiveSeatsUsed(trueUsed, adjustment);
  return { trueUsed, adjustment, used, total, remaining: seatsRemaining(used, total) };
}

export function formatSeatsLeft(remaining: number, total: number): string {
  return `${remaining}/${total} seats left`;
}

export function interviewSeatsUsedWhere(
  candidateProfileId: string
): Prisma.ApplicationWhereInput {
  // Pre-screens never use a seat.
  return {
    candidateProfileId,
    kind: "job",
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
): Promise<SeatBalance> {
  const [trueUsed, profile] = await Promise.all([
    countInterviewSeatsUsed(db, candidateProfileId),
    db.candidateProfile.findUnique({
      where: { id: candidateProfileId },
      select: { interviewSeatsTotal: true, interviewSeatsAdjustment: true },
    }),
  ]);
  return deriveSeatBalance(
    trueUsed,
    profile?.interviewSeatsAdjustment ?? 0,
    profile?.interviewSeatsTotal ?? 0
  );
}

export async function countProfileUnlocks(
  db: Db,
  companyId: string
): Promise<number> {
  return db.profileUnlock.count({ where: { companyId } });
}

export async function getCompanySeatBalance(
  db: Db,
  companyId: string
): Promise<SeatBalance> {
  const [trueUsed, company] = await Promise.all([
    countProfileUnlocks(db, companyId),
    db.company.findUnique({
      where: { id: companyId },
      select: { seatsTotal: true, seatsAdjustment: true },
    }),
  ]);
  return deriveSeatBalance(
    trueUsed,
    company?.seatsAdjustment ?? 0,
    company?.seatsTotal ?? 0
  );
}
