-- New jobs default to the advanced (ElevenLabs) interview.
-- AlterTable
ALTER TABLE "jobs" ALTER COLUMN "voiceAgentType" SET DEFAULT 'advanced';
