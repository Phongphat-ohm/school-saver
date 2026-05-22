CREATE TYPE "ScheduledAnnouncementStatus" AS ENUM ('SCHEDULED', 'SENT', 'CANCELLED');

CREATE TABLE "AnnouncementTemplate" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AnnouncementTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RecipientGroup" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RecipientGroup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RecipientGroupMember" (
  "id" TEXT NOT NULL,
  "groupId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RecipientGroupMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ScheduledAnnouncement" (
  "id" TEXT NOT NULL,
  "target" TEXT NOT NULL,
  "workspaceId" TEXT,
  "userIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "sentAt" TIMESTAMP(3),
  "status" "ScheduledAnnouncementStatus" NOT NULL DEFAULT 'SCHEDULED',
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ScheduledAnnouncement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkspaceFeatureFlag" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "note" TEXT,
  "updatedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkspaceFeatureFlag_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkspaceLimit" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "value" INTEGER NOT NULL,
  "note" TEXT,
  "updatedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkspaceLimit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AnnouncementTemplate_createdById_updatedAt_idx" ON "AnnouncementTemplate"("createdById", "updatedAt");
CREATE INDEX "RecipientGroup_createdById_updatedAt_idx" ON "RecipientGroup"("createdById", "updatedAt");
CREATE UNIQUE INDEX "RecipientGroupMember_groupId_userId_key" ON "RecipientGroupMember"("groupId", "userId");
CREATE INDEX "RecipientGroupMember_userId_idx" ON "RecipientGroupMember"("userId");
CREATE INDEX "ScheduledAnnouncement_status_scheduledAt_idx" ON "ScheduledAnnouncement"("status", "scheduledAt");
CREATE INDEX "ScheduledAnnouncement_createdById_createdAt_idx" ON "ScheduledAnnouncement"("createdById", "createdAt");
CREATE INDEX "ScheduledAnnouncement_workspaceId_scheduledAt_idx" ON "ScheduledAnnouncement"("workspaceId", "scheduledAt");
CREATE UNIQUE INDEX "WorkspaceFeatureFlag_workspaceId_key_key" ON "WorkspaceFeatureFlag"("workspaceId", "key");
CREATE INDEX "WorkspaceFeatureFlag_key_enabled_idx" ON "WorkspaceFeatureFlag"("key", "enabled");
CREATE UNIQUE INDEX "WorkspaceLimit_workspaceId_key_key" ON "WorkspaceLimit"("workspaceId", "key");
CREATE INDEX "WorkspaceLimit_key_idx" ON "WorkspaceLimit"("key");

ALTER TABLE "AnnouncementTemplate" ADD CONSTRAINT "AnnouncementTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RecipientGroup" ADD CONSTRAINT "RecipientGroup_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RecipientGroupMember" ADD CONSTRAINT "RecipientGroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "RecipientGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecipientGroupMember" ADD CONSTRAINT "RecipientGroupMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ScheduledAnnouncement" ADD CONSTRAINT "ScheduledAnnouncement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ScheduledAnnouncement" ADD CONSTRAINT "ScheduledAnnouncement_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkspaceFeatureFlag" ADD CONSTRAINT "WorkspaceFeatureFlag_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkspaceLimit" ADD CONSTRAINT "WorkspaceLimit_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
