-- 0006  MFA, automatic lockout, per-device sessions, saved searches,
--       fraud-report triage, and full-text search indexes.
--
-- Every statement is written to be safely re-runnable.

-- ---------------------------------------------------------------------------
-- 1. User: automatic lockout counters and the MFA flag
-- ---------------------------------------------------------------------------
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "failedLoginCount"  INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastFailedLoginAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lockedUntil"       TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mfaEnabledAt"      TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "User_lockedUntil_idx" ON "User" ("lockedUntil");

-- ---------------------------------------------------------------------------
-- 2. TOTP secrets and recovery codes
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "UserMfaSecret" (
    "id"           TEXT NOT NULL,
    "userId"       TEXT NOT NULL,
    "secretCipher" TEXT NOT NULL,
    "confirmedAt"  TIMESTAMP(3),
    "lastUsedStep" BIGINT,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserMfaSecret_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "UserMfaSecret_userId_key" ON "UserMfaSecret" ("userId");

CREATE TABLE IF NOT EXISTS "UserRecoveryCode" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "codeHash"  TEXT NOT NULL,
    "usedAt"    TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserRecoveryCode_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "UserRecoveryCode_userId_codeHash_key" ON "UserRecoveryCode" ("userId", "codeHash");
CREATE INDEX IF NOT EXISTS "UserRecoveryCode_userId_idx" ON "UserRecoveryCode" ("userId");

-- ---------------------------------------------------------------------------
-- 3. Per-device sessions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "UserSession" (
    "id"             TEXT NOT NULL,
    "userId"         TEXT NOT NULL,
    "tokenId"        TEXT NOT NULL,
    "sessionVersion" INTEGER NOT NULL,
    "userAgent"      TEXT,
    "ipAddress"      TEXT,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt"      TIMESTAMP(3) NOT NULL,
    "revokedAt"      TIMESTAMP(3),
    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "UserSession_tokenId_key" ON "UserSession" ("tokenId");
CREATE INDEX IF NOT EXISTS "UserSession_userId_idx"    ON "UserSession" ("userId");
CREATE INDEX IF NOT EXISTS "UserSession_expiresAt_idx" ON "UserSession" ("expiresAt");

-- ---------------------------------------------------------------------------
-- 4. Saved searches / job alerts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "SavedSearch" (
    "id"            TEXT NOT NULL,
    "userId"        TEXT NOT NULL,
    "name"          TEXT NOT NULL,
    "criteriaJson"  TEXT NOT NULL,
    "alertsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "frequency"     TEXT NOT NULL DEFAULT 'DAILY',
    "lastRunAt"     TIMESTAMP(3),
    "lastAlertAt"   TIMESTAMP(3),
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SavedSearch_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SavedSearch_userId_idx" ON "SavedSearch" ("userId");
CREATE INDEX IF NOT EXISTS "SavedSearch_alertsEnabled_lastRunAt_idx" ON "SavedSearch" ("alertsEnabled", "lastRunAt");

-- ---------------------------------------------------------------------------
-- 5. Foreign keys
-- ---------------------------------------------------------------------------
DO $$ BEGIN
    ALTER TABLE "UserMfaSecret" ADD CONSTRAINT "UserMfaSecret_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "UserRecoveryCode" ADD CONSTRAINT "UserRecoveryCode_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "SavedSearch" ADD CONSTRAINT "SavedSearch_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 6. Fraud report triage
-- ---------------------------------------------------------------------------
ALTER TABLE "FraudReport" ADD COLUMN IF NOT EXISTS "triagedBy"  TEXT;
ALTER TABLE "FraudReport" ADD COLUMN IF NOT EXISTS "triagedAt"  TIMESTAMP(3);
ALTER TABLE "FraudReport" ADD COLUMN IF NOT EXISTS "triageNote" TEXT;
ALTER TABLE "FraudReport" ADD COLUMN IF NOT EXISTS "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX IF NOT EXISTS "FraudReport_status_createdAt_idx" ON "FraudReport" ("status", "createdAt");

-- ---------------------------------------------------------------------------
-- 7. Full-text search
--
-- Generated tsvector columns keep the index in step with the data without a
-- trigger. Prisma does not model generated columns, so these are managed here
-- and queried through $queryRaw in lib/search.ts.
-- ---------------------------------------------------------------------------
ALTER TABLE "Vacancy" ADD COLUMN IF NOT EXISTS "searchVector" tsvector
    GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce("referenceNumber", '')), 'A') ||
        setweight(to_tsvector('english', coalesce("title", '')), 'A') ||
        setweight(to_tsvector('english', coalesce("summary", '')), 'B') ||
        setweight(to_tsvector('english', coalesce("responsibilities", '')), 'C') ||
        setweight(to_tsvector('english', coalesce("essentialQualifications", '')), 'C')
    ) STORED;
CREATE INDEX IF NOT EXISTS "Vacancy_searchVector_idx" ON "Vacancy" USING GIN ("searchVector");

ALTER TABLE "CandidateProfile" ADD COLUMN IF NOT EXISTS "searchVector" tsvector
    GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce("legalFirstName", '')), 'A') ||
        setweight(to_tsvector('english', coalesce("middleName", '')), 'B') ||
        setweight(to_tsvector('english', coalesce("lastName", '')), 'A') ||
        setweight(to_tsvector('english', coalesce("primaryPhone", '')), 'B')
    ) STORED;
CREATE INDEX IF NOT EXISTS "CandidateProfile_searchVector_idx" ON "CandidateProfile" USING GIN ("searchVector");

-- Trigram indexes make the ILIKE fallback (used for short or partial terms,
-- where to_tsquery finds nothing) usable rather than a sequential scan.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS "Vacancy_title_trgm_idx" ON "Vacancy" USING GIN ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "CandidateProfile_lastName_trgm_idx" ON "CandidateProfile" USING GIN ("lastName" gin_trgm_ops);
