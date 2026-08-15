-- Re-parent Project from WorkExperience to CandidateProfile (profile redesign P3).
-- Data-preserving: add the new column nullable, backfill from each project's
-- current work experience, then enforce NOT NULL and drop the old linkage.

-- 1. Add the new column (nullable for the backfill).
ALTER TABLE "projects" ADD COLUMN     "candidateProfileId" TEXT;

-- 2. Backfill from the owning work experience.
UPDATE "projects"
SET "candidateProfileId" = (
  SELECT "candidateProfileId"
  FROM "work_experiences"
  WHERE "work_experiences"."id" = "projects"."workExperienceId"
);

-- 3. Make it required (every project had a work experience via the old FK, so
--    no row is left NULL).
ALTER TABLE "projects" ALTER COLUMN "candidateProfileId" SET NOT NULL;

-- 4. Drop the old FK, index and column.
ALTER TABLE "projects" DROP CONSTRAINT "projects_workExperienceId_fkey";
DROP INDEX "projects_workExperienceId_idx";
ALTER TABLE "projects" DROP COLUMN "workExperienceId";

-- 5. New index + FK.
CREATE INDEX "projects_candidateProfileId_idx" ON "projects"("candidateProfileId");
ALTER TABLE "projects" ADD CONSTRAINT "projects_candidateProfileId_fkey" FOREIGN KEY ("candidateProfileId") REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
