-- CreateEnum
CREATE TYPE "QuestionCategory" AS ENUM ('core', 'personalized', 'behavioral');

-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "idealCandidateProfile" TEXT,
ADD COLUMN     "interviewHints" TEXT,
ADD COLUMN     "passingCriteria" TEXT;

-- CreateTable
CREATE TABLE "generated_questions" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "category" "QuestionCategory" NOT NULL,
    "text" TEXT NOT NULL,
    "rationale" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "generated_questions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "generated_questions_applicationId_idx" ON "generated_questions"("applicationId");

-- AddForeignKey
ALTER TABLE "generated_questions" ADD CONSTRAINT "generated_questions_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
