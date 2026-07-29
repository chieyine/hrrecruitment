DELETE FROM "AccommodationRequest" AS accommodation
WHERE NOT EXISTS (
  SELECT 1
  FROM "Application" AS application
  WHERE application."id" = accommodation."applicationId"
);

ALTER TABLE "AccommodationRequest"
ADD CONSTRAINT "AccommodationRequest_applicationId_fkey"
FOREIGN KEY ("applicationId") REFERENCES "Application"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
