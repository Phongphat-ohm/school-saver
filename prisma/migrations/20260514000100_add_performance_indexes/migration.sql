-- Speed up common workspace-scoped page loads and dashboard summaries.
CREATE INDEX "WorkspaceInvitation_workspaceId_status_createdAt_idx" ON "WorkspaceInvitation"("workspaceId", "status", "createdAt");
CREATE INDEX "WorkspaceInvitation_invitedUserId_status_createdAt_idx" ON "WorkspaceInvitation"("invitedUserId", "status", "createdAt");

CREATE INDEX "WorkspaceMember_workspaceId_status_role_createdAt_idx" ON "WorkspaceMember"("workspaceId", "status", "role", "createdAt");
CREATE INDEX "WorkspaceMember_userId_status_createdAt_idx" ON "WorkspaceMember"("userId", "status", "createdAt");

CREATE INDEX "Member_workspaceId_status_idx" ON "Member"("workspaceId", "status");

CREATE INDEX "CollectionRound_workspaceId_status_createdAt_idx" ON "CollectionRound"("workspaceId", "status", "createdAt");

CREATE INDEX "MemberRound_workspaceId_status_remainingAmount_idx" ON "MemberRound"("workspaceId", "status", "remainingAmount");
CREATE INDEX "MemberRound_workspaceId_remainingAmount_idx" ON "MemberRound"("workspaceId", "remainingAmount");
CREATE INDEX "MemberRound_workspaceId_roundId_status_remainingAmount_idx" ON "MemberRound"("workspaceId", "roundId", "status", "remainingAmount");

CREATE INDEX "PaymentTransaction_workspaceId_paidAt_idx" ON "PaymentTransaction"("workspaceId", "paidAt");
CREATE INDEX "PaymentTransaction_workspaceId_memberRoundId_paidAt_idx" ON "PaymentTransaction"("workspaceId", "memberRoundId", "paidAt");
