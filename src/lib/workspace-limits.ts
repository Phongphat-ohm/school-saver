import "server-only";

import { getWorkspaceLimit } from "@/lib/platform-settings";
import { prisma } from "@/lib/prisma";

const DEFAULT_MAX_WORKSPACE_USERS = 30;

type WorkspaceUserLimitClient = {
  workspaceMember: {
    count(args: { where: { workspaceId: string; status: "ACTIVE" } }): Promise<number>;
    findMany(args: {
      where: { workspaceId: string; status: "ACTIVE"; userId?: { in: string[] } };
      select: { userId: true };
    }): Promise<Array<{ userId: string }>>;
  };
  workspaceInvitation: {
    findMany(args: {
      where: { workspaceId: string; status: "PENDING" };
      select: { invitedUserId: true };
      distinct: ["invitedUserId"];
    }): Promise<Array<{ invitedUserId: string }>>;
  };
};

export type WorkspaceUserLimitUsage = {
  activeUsers: number;
  pendingUsers: number;
  usedSlots: number;
  maxUsers: number;
  availableSlots: number;
};

export async function getWorkspaceUserLimitUsage(workspaceId: string, client: WorkspaceUserLimitClient = prisma) {
  const [activeUsers, pendingInvitations, maxUsers] = await Promise.all([
    client.workspaceMember.count({ where: { workspaceId, status: "ACTIVE" } }),
    client.workspaceInvitation.findMany({
      where: { workspaceId, status: "PENDING" },
      select: { invitedUserId: true },
      distinct: ["invitedUserId"],
    }),
    getWorkspaceLimit(workspaceId, "max_workspace_users", DEFAULT_MAX_WORKSPACE_USERS),
  ]);

  const pendingUserIds = pendingInvitations.map((invitation) => invitation.invitedUserId);
  const pendingActiveMemberships = pendingUserIds.length
    ? await client.workspaceMember.findMany({
        where: { workspaceId, status: "ACTIVE", userId: { in: pendingUserIds } },
        select: { userId: true },
      })
    : [];
  const activeUserIds = new Set(pendingActiveMemberships.map((membership) => membership.userId));
  const pendingUsers = pendingUserIds.filter((userId) => !activeUserIds.has(userId)).length;
  const usedSlots = activeUsers + pendingUsers;

  return {
    activeUsers,
    pendingUsers,
    usedSlots,
    maxUsers,
    availableSlots: Math.max(0, maxUsers - usedSlots),
  };
}

export async function ensureWorkspaceUserLimit(
  workspaceId: string,
  adding = 1,
  client: WorkspaceUserLimitClient = prisma,
): Promise<WorkspaceUserLimitUsage> {
  const usage = await getWorkspaceUserLimitUsage(workspaceId, client);
  if (usage.usedSlots + adding > usage.maxUsers) {
    throw new Error(
      `workspace นี้มีผู้ใช้ครบตาม limit แล้ว (${usage.usedSlots}/${usage.maxUsers} slots, active ${usage.activeUsers}, pending ${usage.pendingUsers})`,
    );
  }
  return usage;
}
