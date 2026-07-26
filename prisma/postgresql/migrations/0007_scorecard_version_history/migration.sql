-- Preserve submitted screening-scorecard evidence when an authorized user
-- reopens and corrects a scorecard.
ALTER TABLE "CandidateScorecard"
  ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "CandidateScorecard"
  ADD COLUMN IF NOT EXISTS "previousVersionsJson" TEXT NOT NULL DEFAULT '[]';
