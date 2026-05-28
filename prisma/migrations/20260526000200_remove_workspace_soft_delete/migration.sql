-- Revert the mistaken workspace soft-delete column. Workspace deletion stays on
-- the original workspace delete flow; deletion support is implemented for rounds.
DROP INDEX IF EXISTS "Workspace_status_deletedAt_createdAt_idx";

ALTER TABLE "Workspace" DROP COLUMN IF EXISTS "deletedAt";

CREATE INDEX IF NOT EXISTS "Workspace_status_createdAt_idx" ON "Workspace"("status", "createdAt");
