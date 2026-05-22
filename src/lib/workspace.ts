import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getActiveSupportSessionForWorkspace, getSupportRole } from "@/lib/support-access";

export const assertWorkspaceAccess = cache(async function assertWorkspaceAccess(userId: string, workspaceId: string) {
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId, workspaceId, status: "ACTIVE" },
    include: { workspace: true },
  });
  if (membership) {
    if (membership.workspace.status !== "ACTIVE") throw new Error("workspace นี้ถูกปิดใช้งาน");
    return membership;
  }

  const supportSession = await getActiveSupportSessionForWorkspace(workspaceId);
  if (!supportSession) throw new Error("ไม่พบสิทธิ์ใน workspace นี้");

  if (supportSession.workspace.status !== "ACTIVE") throw new Error("workspace นี้ถูกปิดใช้งาน");

  return {
    id: `support-${supportSession.id}`,
    workspaceId,
    userId,
    role: getSupportRole(supportSession.mode),
    status: "ACTIVE" as const,
    createdAt: supportSession.workspace.createdAt,
    updatedAt: supportSession.workspace.updatedAt,
    workspace: supportSession.workspace,
  };
});

export async function getUserWorkspaceRole(userId: string, workspaceId: string) {
  return (await assertWorkspaceAccess(userId, workspaceId)).role;
}

export const getCurrentWorkspaceOrThrow = cache(async function getCurrentWorkspaceOrThrow() {
  const session = await getSession();
  if (!session) throw new Error("กรุณาเข้าสู่ระบบ");
  if (!session.currentWorkspaceId) throw new Error("ยังไม่มี workspace ที่ใช้งานอยู่");
  const membership = await assertWorkspaceAccess(session.userId, session.currentWorkspaceId);
  return {
    userId: session.userId,
    workspaceId: session.currentWorkspaceId,
    role: membership.role,
    workspace: membership.workspace,
  };
});
