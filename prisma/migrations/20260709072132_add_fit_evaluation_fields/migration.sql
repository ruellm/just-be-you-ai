-- AlterTable
ALTER TABLE "interview_results" ADD COLUMN     "concernsJson" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "fitSignalsJson" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "fitSummary" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "passed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "recommendation" TEXT NOT NULL DEFAULT 'consider',
ADD COLUMN     "strengthsJson" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "interviewMaxMinutes" INTEGER;
