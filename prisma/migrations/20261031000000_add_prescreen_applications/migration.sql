-- CreateEnum
CREATE TYPE "ApplicationKind" AS ENUM ('job', 'prescreen');

-- AlterTable
ALTER TABLE "applications" ALTER COLUMN "jobId" DROP NOT NULL,
ADD COLUMN     "kind" "ApplicationKind" NOT NULL DEFAULT 'job';

-- One pre-screen row per candidate. The (candidateProfileId, jobId) unique
-- constraint cannot enforce this because jobId is NULL for pre-screens.
CREATE UNIQUE INDEX "applications_one_prescreen_per_candidate" ON "applications"("candidateProfileId") WHERE "kind" = 'prescreen';
