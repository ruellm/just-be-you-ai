-- CreateEnum
CREATE TYPE "CandidateTier" AS ENUM ('free', 'professional');

-- AlterTable
ALTER TABLE "candidate_profiles" ADD COLUMN     "tier" "CandidateTier" NOT NULL DEFAULT 'free';
