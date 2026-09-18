-- AlterTable
ALTER TABLE "applications" ADD COLUMN     "resumeSnapshotAt" TIMESTAMP(3),
ADD COLUMN     "appliedParsedResumeText" TEXT,
ADD COLUMN     "appliedCleanedResumeText" TEXT,
ADD COLUMN     "appliedResumeFlagsJson" JSONB;
