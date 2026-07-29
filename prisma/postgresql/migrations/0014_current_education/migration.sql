ALTER TABLE "CandidateEducation"
ALTER COLUMN "completionYear" DROP NOT NULL;

ALTER TABLE "CandidateEducation"
ADD COLUMN "isCurrent" BOOLEAN NOT NULL DEFAULT false;
