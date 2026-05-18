ALTER TABLE "Workspace" ADD COLUMN "memberCardToken" TEXT;

UPDATE "Workspace"
SET "memberCardToken" = 'mcard_' || md5(random()::text || clock_timestamp()::text || "id")
WHERE "memberCardToken" IS NULL;

ALTER TABLE "Workspace" ALTER COLUMN "memberCardToken" SET NOT NULL;

CREATE UNIQUE INDEX "Workspace_memberCardToken_key" ON "Workspace"("memberCardToken");
