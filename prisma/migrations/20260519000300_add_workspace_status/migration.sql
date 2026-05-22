-- CreateEnum
CREATE TYPE "WorkspaceStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN "status" "WorkspaceStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateIndex
CREATE INDEX "Workspace_status_createdAt_idx" ON "Workspace"("status", "createdAt");
