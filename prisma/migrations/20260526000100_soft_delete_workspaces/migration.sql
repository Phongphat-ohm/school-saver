-- Add soft delete support for workspaces. Deleted workspaces stay in the
-- database for history/audit purposes, but application queries hide them.
ALTER TABLE "Workspace" ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE INDEX "Workspace_status_deletedAt_createdAt_idx" ON "Workspace"("status", "deletedAt", "createdAt");

DROP INDEX IF EXISTS "Workspace_status_createdAt_idx";
