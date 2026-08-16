-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "seatsTotal" INTEGER NOT NULL DEFAULT 25;

-- CreateTable
CREATE TABLE "profile_unlocks" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "candidateProfileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_unlocks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profile_unlocks_companyId_candidateProfileId_key" ON "profile_unlocks"("companyId", "candidateProfileId");

-- AddForeignKey
ALTER TABLE "profile_unlocks" ADD CONSTRAINT "profile_unlocks_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_unlocks" ADD CONSTRAINT "profile_unlocks_candidateProfileId_fkey" FOREIGN KEY ("candidateProfileId") REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

