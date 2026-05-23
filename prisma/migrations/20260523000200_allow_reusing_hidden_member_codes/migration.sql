DROP INDEX IF EXISTS "Member_workspaceId_memberCode_key";

CREATE UNIQUE INDEX "Member_workspaceId_memberCode_visible_key"
ON "Member"("workspaceId", "memberCode")
WHERE "status" <> 'HIDDEN';

CREATE INDEX "Member_workspaceId_memberCode_idx"
ON "Member"("workspaceId", "memberCode");
