-- AlterTable
ALTER TABLE "candidate_profiles" ADD COLUMN     "resumeFlagsJson" JSONB;

-- AlterTable
ALTER TABLE "interview_results" ADD COLUMN     "manipulationAttemptsJson" JSONB;
