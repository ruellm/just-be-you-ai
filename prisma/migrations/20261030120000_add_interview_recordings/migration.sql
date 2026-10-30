-- CreateEnum
CREATE TYPE "RecordingStatus" AS ENUM ('recording', 'complete', 'incomplete', 'deleted');

-- CreateTable
CREATE TABLE "interview_recordings" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "consentAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "status" "RecordingStatus" NOT NULL DEFAULT 'recording',
    "mimeType" TEXT NOT NULL,
    "partCount" INTEGER NOT NULL DEFAULT 0,
    "totalBytes" BIGINT NOT NULL DEFAULT 0,
    "storagePrefix" TEXT NOT NULL,
    "deleteAfter" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "interview_recordings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "interview_recordings_applicationId_idx" ON "interview_recordings"("applicationId");

-- CreateIndex
CREATE INDEX "interview_recordings_deleteAfter_idx" ON "interview_recordings"("deleteAfter");

-- AddForeignKey
ALTER TABLE "interview_recordings" ADD CONSTRAINT "interview_recordings_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
