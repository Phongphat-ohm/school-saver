ALTER TABLE "ActivityLog" ALTER COLUMN "workspaceId" DROP NOT NULL;
ALTER TABLE "ActivityLog" ALTER COLUMN "userId" DROP NOT NULL;

ALTER TABLE "ActivityLog"
ADD COLUMN "outcome" TEXT NOT NULL DEFAULT 'SUCCESS',
ADD COLUMN "ipAddress" TEXT,
ADD COLUMN "userAgent" TEXT,
ADD COLUMN "method" TEXT,
ADD COLUMN "path" TEXT;

CREATE INDEX "ActivityLog_workspaceId_createdAt_idx" ON "ActivityLog"("workspaceId", "createdAt");
CREATE INDEX "ActivityLog_workspaceId_action_createdAt_idx" ON "ActivityLog"("workspaceId", "action", "createdAt");
CREATE INDEX "ActivityLog_ipAddress_outcome_createdAt_idx" ON "ActivityLog"("ipAddress", "outcome", "createdAt");
