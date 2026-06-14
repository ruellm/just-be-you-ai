-- AlterTable
ALTER TABLE "candidate_profiles" ADD COLUMN     "parsedResumeText" TEXT,
ADD COLUMN     "resumeParsedAt" TIMESTAMP(3);
