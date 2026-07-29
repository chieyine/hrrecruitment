-- Record completion of each assigned learning module. Passing the final quiz
-- remains separate evidence; a candidate cannot complete a course by uploading
-- an unverified certificate or clicking one global completion button.

CREATE TABLE "CandidateCourseContentProgress" (
  "id" TEXT NOT NULL,
  "candidateCourseId" TEXT NOT NULL,
  "courseContentId" TEXT NOT NULL,
  "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "evidenceJson" TEXT,

  CONSTRAINT "CandidateCourseContentProgress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CandidateCourseContentProgress_candidateCourseId_courseContentId_key"
  ON "CandidateCourseContentProgress"("candidateCourseId", "courseContentId");

CREATE INDEX "CandidateCourseContentProgress_candidateCourseId_completedAt_idx"
  ON "CandidateCourseContentProgress"("candidateCourseId", "completedAt");

ALTER TABLE "CandidateCourseContentProgress"
  ADD CONSTRAINT "CandidateCourseContentProgress_candidateCourseId_fkey"
  FOREIGN KEY ("candidateCourseId") REFERENCES "CandidateCourse"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CandidateCourseContentProgress"
  ADD CONSTRAINT "CandidateCourseContentProgress_courseContentId_fkey"
  FOREIGN KEY ("courseContentId") REFERENCES "CourseContent"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
