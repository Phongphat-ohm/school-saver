ALTER TABLE "User"
ADD COLUMN "cancelledAt" TIMESTAMP(3),
ADD COLUMN "restoreUntil" TIMESTAMP(3),
ADD COLUMN "anonymizedAt" TIMESTAMP(3);

ALTER TABLE "WorkspaceMember"
ADD COLUMN "cancelledAt" TIMESTAMP(3);

CREATE INDEX "User_status_restoreUntil_idx" ON "User"("status", "restoreUntil");
CREATE INDEX "User_anonymizedAt_idx" ON "User"("anonymizedAt");
CREATE INDEX "WorkspaceMember_userId_status_cancelledAt_idx" ON "WorkspaceMember"("userId", "status", "cancelledAt");
