-- The CDP Programme Evaluation results moved to their own platform (cdp-platform/, own database).
-- Remove the CDP tables, the viewer role and the raw-data permission from Omantel Assets.

DROP TABLE IF EXISTS "SurveyDataset";
DROP TABLE IF EXISTS "SurveyThemeTag";
DROP TABLE IF EXISTS "SurveyNameRule";
DROP TABLE IF EXISTS "SurveySetting";
DROP TYPE IF EXISTS "SurveyStatus";

ALTER TABLE "User" DROP COLUMN IF EXISTS "cdpRaw";

-- Management viewers belonged to the CDP platform: they lose access here (kept disabled for the audit trail).
DELETE FROM "Session" WHERE "userId" IN (SELECT "id" FROM "User" WHERE "role"::text = 'VIEWER');
UPDATE "User" SET "role" = 'EDITOR', "active" = false WHERE "role"::text = 'VIEWER';

ALTER TYPE "Role" RENAME TO "Role_old";
CREATE TYPE "Role" AS ENUM ('ADMIN', 'EDITOR');
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role" USING ("role"::text::"Role");
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'EDITOR';
DROP TYPE "Role_old";
