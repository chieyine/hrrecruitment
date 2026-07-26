UPDATE "ReferenceResponse"
SET "outcome" = 'SATISFACTORY_WITH_CONCERNS'
WHERE "outcome" = 'CONCERNS';

UPDATE "Application"
SET "referenceStatus" = 'SATISFACTORY_WITH_CONCERNS'
WHERE "referenceStatus" = 'CONCERNS';
