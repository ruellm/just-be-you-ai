-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "seatsAdjustment" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "candidate_profiles" ADD COLUMN     "interviewSeatsAdjustment" INTEGER NOT NULL DEFAULT 0;
