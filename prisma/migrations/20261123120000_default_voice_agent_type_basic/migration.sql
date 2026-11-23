-- New jobs default to the basic (LiveKit) interview again.
-- AlterTable
ALTER TABLE "jobs" ALTER COLUMN "voiceAgentType" SET DEFAULT 'basic';
