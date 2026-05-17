"use server";

import { OWNER_ADMIN, requireWorkspaceRole } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { errorResult, successResult } from "@/lib/result";

export async function getActivityLogsAction(limit = 100) {
  try {
    const { workspaceId } = await requireWorkspaceRole(OWNER_ADMIN);
    const logs = await prisma.activityLog.findMany({
      where: { workspaceId },
      include: {
        user: { select: { id: true, username: true, fullName: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(Math.max(limit, 1), 200),
    });

    return successResult(logs);
  } catch (error) {
    return errorResult(error instanceof Error ? error.message : "ไม่สามารถดึง activity log ได้");
  }
}
