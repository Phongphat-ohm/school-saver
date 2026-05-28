-- CreateEnum
CREATE TYPE "AppVersionStatus" AS ENUM ('PLANNED', 'ACTIVE', 'ARCHIVED');

-- AlterTable
ALTER TABLE "AppVersion"
ADD COLUMN "status" "AppVersionStatus" NOT NULL DEFAULT 'PLANNED',
ADD COLUMN "plannedAt" TIMESTAMP(3),
ADD COLUMN "activatedAt" TIMESTAMP(3);

-- Planned releases are not active by default.
ALTER TABLE "AppVersion" ALTER COLUMN "isPublished" SET DEFAULT false;

-- Preserve existing published releases as active for installs that already used the first version workflow.
UPDATE "AppVersion"
SET "status" = 'ACTIVE',
    "activatedAt" = COALESCE("activatedAt", "createdAt")
WHERE "isPublished" = true;

-- CreateIndex
CREATE INDEX "AppVersion_status_activatedAt_idx" ON "AppVersion"("status", "activatedAt");
