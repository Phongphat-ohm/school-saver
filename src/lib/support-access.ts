import type { WorkspaceRole } from "@/generated/prisma/client";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { getSession, getSupportSessionId } from "@/lib/session";

export const getActiveSupportSession = cache(async function getActiveSupportSession() {
  const [session, supportSessionId] = await Promise.all([getSession(), getSupportSessionId()]);
  if (!session || !supportSessionId) return null;

  const supportSession = await prisma.superAdminSupportSession.findFirst({
    where: {
      id: supportSessionId,
      actorUserId: session.userId,
      status: "ACTIVE",
      expiresAt: { gt: new Date() },
    },
    select: {
      id: true,
      mode: true,
      reason: true,
      expiresAt: true,
      workspaceId: true,
    },
  });
  if (!supportSession) return null;

  const workspace = await prisma.workspace.findUnique({
    where: { id: supportSession.workspaceId },
    select: { id: true, name: true, description: true, status: true, memberCardToken: true, ownerId: true, createdAt: true, updatedAt: true },
  });
  if (!workspace) return null;

  return { ...supportSession, workspace };
});

export async function getActiveSupportSessionForWorkspace(workspaceId: string) {
  const supportSession = await getActiveSupportSession();
  if (!supportSession || supportSession.workspaceId !== workspaceId) return null;
  return supportSession;
}

export function getSupportRole(mode: "READ_ONLY" | "FULL_SUPPORT"): WorkspaceRole {
  return mode === "FULL_SUPPORT" ? "ADMIN" : "VIEWER";
}
