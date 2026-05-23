"use server";

import { getDefaultBillingPlan, getWorkspaceLimit, getWorkspaceMemberLimit } from "@/lib/platform-settings";
import { prisma } from "@/lib/prisma";
import { errorResult, successResult } from "@/lib/result";
import { getCurrentWorkspaceOrThrow } from "@/lib/workspace";
import { getWorkspaceUserLimitUsage } from "@/lib/workspace-limits";

const defaultWorkspaceLimits = {
  maxActiveRounds: 20,
  maxWorkspaceUsers: 30,
} as const;

export async function getCurrentWorkspacePlanLimitsAction() {
  try {
    const { workspaceId } = await getCurrentWorkspaceOrThrow();
    const [plan, userUsage, memberLimit, activeMembers, activeRounds] = await Promise.all([
      getDefaultBillingPlan(),
      getWorkspaceUserLimitUsage(workspaceId),
      getWorkspaceMemberLimit(workspaceId),
      prisma.member.count({ where: { workspaceId, status: "ACTIVE" } }),
      prisma.collectionRound.count({ where: { workspaceId, status: "OPEN" } }),
    ]);
    const maxActiveRounds = await getWorkspaceLimit(workspaceId, "max_active_rounds", defaultWorkspaceLimits.maxActiveRounds);

    return successResult({
      plan,
      limits: [
        {
          key: "max_workspace_users",
          label: "ผู้ใช้ใน Workspace",
          used: userUsage.activeUsers,
          reserved: userUsage.pendingUsers,
          limit: userUsage.maxUsers,
          description: "นับผู้ใช้ที่ใช้งานอยู่ และคำเชิญ/คำขอเข้าร่วมที่รอตอบรับเป็น slot ที่จองไว้",
        },
        {
          key: "max_members",
          label: "สมาชิก",
          used: activeMembers,
          reserved: 0,
          limit: memberLimit,
          description: "จำนวนสมาชิก ACTIVE ที่ใช้ในรอบเก็บเงินและรายงาน",
        },
        {
          key: "max_active_rounds",
          label: "รอบที่เปิดอยู่",
          used: activeRounds,
          reserved: 0,
          limit: maxActiveRounds,
          description: "จำนวนรอบเก็บเงินสถานะ OPEN ใน workspace ปัจจุบัน",
        },
      ],
    });
  } catch (error) {
    return errorResult(error instanceof Error ? error.message : "ไม่สามารถดึงข้อมูล plan และ limit ได้");
  }
}
