-- AlterTable
ALTER TABLE "interview_results" ADD COLUMN     "rubricScoresJson" JSONB,
ADD COLUMN     "compositeScore" DOUBLE PRECISION,
ADD COLUMN     "verdict" TEXT,
ADD COLUMN     "gatesFiredJson" JSONB;

-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "mustHaveCriteriaJson" JSONB;
