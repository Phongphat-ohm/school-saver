-- CreateEnum
CREATE TYPE "SupportSessionMode" AS ENUM ('READ_ONLY', 'FULL_SUPPORT');

-- CreateEnum
CREATE TYPE "SupportSessionStatus" AS ENUM ('ACTIVE', 'ENDED');

-- CreateTable
CREATE TABLE "PlatformSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "SuperAdminSupportSession" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "mode" "SupportSessionMode" NOT NULL DEFAULT 'READ_ONLY',
    "status" "SupportSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "reason" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SuperAdminSupportSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlatformSetting_updatedAt_idx" ON "PlatformSetting"("updatedAt");

-- CreateIndex
CREATE INDEX "SuperAdminSupportSession_workspaceId_status_expiresAt_idx" ON "SuperAdminSupportSession"("workspaceId", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "SuperAdminSupportSession_actorUserId_status_createdAt_idx" ON "SuperAdminSupportSession"("actorUserId", "status", "createdAt");

-- AddForeignKey
ALTER TABLE "SuperAdminSupportSession" ADD CONSTRAINT "SuperAdminSupportSession_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuperAdminSupportSession" ADD CONSTRAINT "SuperAdminSupportSession_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
