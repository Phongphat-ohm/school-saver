import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function assertWorkspaceAccess(userId: string, workspaceId: string) {
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId, workspaceId, status: "ACTIVE" },
    include: { workspace: true },
  });
  if (!membership) throw new Error("ไม่พบสิทธิ์ใน workspace นี้");
  return membership;
}

export async function getUserWorkspaceRole(userId: string, workspaceId: string) {
  return (await assertWorkspaceAccess(userId, workspaceId)).role;
}

export async function getCurrentWorkspaceOrThrow() {
  const session = await getSession();
  if (!session) throw new Error("กรุณาเข้าสู่ระบบ");
  const membership = await assertWorkspaceAccess(session.userId, session.currentWorkspaceId);
  return {
    userId: session.userId,
    workspaceId: session.currentWorkspaceId,
    role: membership.role,
    workspace: membership.workspace,
  };
}
