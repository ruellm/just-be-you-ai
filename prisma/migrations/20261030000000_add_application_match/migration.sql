-- AlterTable
ALTER TABLE "applications" ADD COLUMN     "matchPercent" INTEGER,
ADD COLUMN     "matchJson" JSONB,
ADD COLUMN     "matchedAt" TIMESTAMP(3);
