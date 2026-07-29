UPDATE "ComplaintCase" AS complaint
SET "applicationId" = NULL
WHERE "applicationId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "Application" AS application
    WHERE application."id" = complaint."applicationId"
  );

ALTER TABLE "ComplaintCase"
ADD CONSTRAINT "ComplaintCase_applicationId_fkey"
FOREIGN KEY ("applicationId") REFERENCES "Application"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
