-- AlterTable (additive, nullable — safe on existing rows)
ALTER TABLE "candidate_profiles" ADD COLUMN     "middleName" TEXT,
ADD COLUMN     "suffix" TEXT;
