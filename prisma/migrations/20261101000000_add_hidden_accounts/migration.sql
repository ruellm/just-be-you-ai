-- Admin-hidden accounts. null = visible.
-- AlterTable
ALTER TABLE "candidate_profiles" ADD COLUMN     "hiddenAt" TIMESTAMP(3),
ADD COLUMN     "hiddenReason" TEXT,
ADD COLUMN     "hiddenById" UUID;

-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "hiddenAt" TIMESTAMP(3),
ADD COLUMN     "hiddenReason" TEXT,
ADD COLUMN     "hiddenById" UUID;
