-- Run when Prisma migrate is out of sync with the remote DB.
-- Adds ScreeningResult fields required by AI Resume Screener.

ALTER TABLE "ScreeningResult" ADD COLUMN IF NOT EXISTS "overallScore" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "ScreeningResult" ADD COLUMN IF NOT EXISTS "fitStatus" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ScreeningResult" ADD COLUMN IF NOT EXISTS "panelSummary" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ScreeningResult" ADD COLUMN IF NOT EXISTS "concerns" JSONB[] NOT NULL DEFAULT ARRAY[]::JSONB[];
