"use server";

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { errorResult, successResult } from "@/lib/result";
import { requireSuperAdmin } from "@/lib/permissions";
import { startOfDay, endOfDay } from "@/lib/date";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { hashPassword } from "@/lib/password";
import { clearSupportSessionId, getSupportSessionId, setCurrentWorkspace, setSupportSessionId } from "@/lib/session";
import { processDueScheduledAnnouncements } from "@/lib/scheduled-announcements";
import { compareAppVersions, getCurrentAppVersion, parseAppVersion } from "@/lib/app-version";

const workspaceStatusSchema = z.object({
  workspaceId: z.string().min(1),
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

const workspaceIdSchema = z.object({
  workspaceId: z.string().min(1),
});

const userStatusSchema = z.object({
  userId: z.string().min(1),
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

const userRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["USER", "SUPER_ADMIN"]),
});

const userIdSchema = z.object({
  userId: z.string().min(1),
});

const announcementSchema = z.object({
  target: z.enum(["ALL", "WORKSPACE", "USER"]),
  workspaceId: z.string().optional(),
  userId: z.string().optional(),
  userIds: z.array(z.string().min(1)).optional(),
  groupId: z.string().optional(),
  title: z.string().trim().min(3).max(120),
  message: z.string().trim().min(3).max(500),
});

const announcementTemplateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  title: z.string().trim().min(3).max(120),
  message: z.string().trim().min(3).max(500),
});

const recipientGroupSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(240).optional(),
  userIds: z.array(z.string().min(1)).min(1),
});

const scheduledAnnouncementSchema = announcementSchema.extend({
  scheduledAt: z.string().min(1),
});

const idSchema = z.object({
  id: z.string().min(1),
});

const adminExportDatasetSchema = z.object({
  dataset: z.enum(["users", "workspaces", "payments", "activity_logs"]),
});

const workspaceFeatureFlagSchema = z.object({
  workspaceId: z.string().min(1),
  key: z.string().trim().min(2).max(80),
  enabled: z.boolean(),
  note: z.string().trim().max(240).optional(),
});

const workspaceLimitSchema = z.object({
  workspaceId: z.string().min(1),
  key: z.string().trim().min(2).max(80),
  value: z.coerce.number().int().min(0).max(1_000_000),
  note: z.string().trim().max(240).optional(),
});

const resetPasswordSchema = z.object({
  userId: z.string().min(1),
});

const supportSessionSchema = z.object({
  workspaceId: z.string().min(1),
  mode: z.enum(["READ_ONLY", "FULL_SUPPORT"]),
  reason: z.string().trim().min(5).max(300),
  durationMinutes: z.coerce.number().int().min(15).max(240).default(60),
});

const endSupportSessionSchema = z.object({
  sessionId: z.string().min(1),
});

const platformSettingSchema = z.object({
  key: z.string().min(1),
  value: z.string().trim().min(1).max(500),
});

const appVersionSchema = z.object({
  version: z.string().trim().min(5).max(20),
  title: z.string().trim().min(3).max(120),
  features: z.string().trim().min(3).max(2000),
  plannedAt: z.string().trim().optional(),
});

const appVersionIdSchema = z.object({
  id: z.string().min(1),
});

const DEFAULT_PLATFORM_SETTINGS = [
  { key: "max_members_per_workspace", value: "500", label: "จำนวนสมาชิกสูงสุดต่อ workspace" },
  { key: "maintenance_mode", value: "false", label: "Maintenance mode" },
  { key: "otp_rate_limit_seconds", value: "60", label: "OTP rate limit seconds" },
  { key: "activity_log_retention_days", value: "365", label: "Activity log retention days" },
  { key: "default_workspace_status", value: "ACTIVE", label: "สถานะเริ่มต้นของ workspace" },
  { key: "enable_beta_broadcasts", value: "true", label: "เปิดระบบ Broadcast รุ่นใหม่" },
  { key: "enable_workspace_health_alerts", value: "true", label: "เปิดแจ้งเตือน Workspace Health" },
  { key: "billing_plan_default", value: "FREE", label: "แพ็กเกจเริ่มต้น" },
] as const;

const ADMIN_EXPORT_LIMIT = 1000;

const adminExportDefinitions = {
  users: {
    label: "ผู้ใช้",
    filename: "platform-users.csv",
    description: "ข้อมูลบัญชี สิทธิ์ สถานะ และวันที่สร้าง",
  },
  workspaces: {
    label: "เวิร์กสเปซ",
    filename: "platform-workspaces.csv",
    description: "การใช้งานเวิร์กสเปซและจำนวนข้อมูลหลัก",
  },
  payments: {
    label: "การชำระเงิน",
    filename: "platform-payments.csv",
    description: "ธุรกรรมล่าสุดของแพลตฟอร์ม",
  },
  activity_logs: {
    label: "บันทึกกิจกรรม",
    filename: "platform-activity-logs.csv",
    description: "บันทึกกิจกรรมและความปลอดภัยล่าสุด",
  },
} as const;

const sensitiveAuditActions = [
  "LOGIN",
  "LOGIN_FAILED",
  "SECURITY_BLOCKED_IP",
  "SUPER_ADMIN_RESET_USER_PASSWORD",
  "SUPER_ADMIN_UPDATE_USER_ROLE",
  "SUPER_ADMIN_START_SUPPORT_SESSION",
  "SUPER_ADMIN_ENTER_SUPPORT_MODE",
  "SUPER_ADMIN_EXIT_SUPPORT_MODE",
  "SUPER_ADMIN_END_SUPPORT_SESSION",
  "SUPER_ADMIN_EXPORT_DATA",
] as const;

const defaultFeatureFlags = ["beta_broadcasts", "advanced_reports", "member_card_public_link", "payment_qr_scanner"] as const;
const defaultWorkspaceLimits = [
  { key: "max_members", value: 500 },
  { key: "max_active_rounds", value: 20 },
  { key: "max_workspace_users", value: 30 },
] as const;

function parseDateInput(value?: string | string[]) {
  if (!value || Array.isArray(value)) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function containsInsensitive(value: string) {
  return { contains: value, mode: "insensitive" as const };
}

function parseNumberInput(value?: string | string[]) {
  if (!value || Array.isArray(value)) return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function getPagination(filters: { page?: string | string[]; pageSize?: string | string[] }) {
  const rawPage = parseNumberInput(filters.page);
  const rawPageSize = parseNumberInput(filters.pageSize);
  const page = Math.max(1, Math.floor(rawPage ?? 1));
  const pageSize = Math.min(100, Math.max(10, Math.floor(rawPageSize ?? 20)));
  return { page, pageSize, skip: (page - 1) * pageSize };
}

function paginateRows<T>(rows: T[], page: number, pageSize: number) {
  const total = rows.length;
  return {
    rows: rows.slice((page - 1) * pageSize, page * pageSize),
    pagination: { page, pageSize, total },
  };
}

function validatePlatformSettingValue(key: string, value: string) {
  if (key === "maintenance_mode" && !["true", "false"].includes(value.toLowerCase())) {
    return "maintenance_mode ต้องเป็น true หรือ false";
  }
  if (key === "default_workspace_status" && !["ACTIVE", "INACTIVE"].includes(value)) {
    return "default_workspace_status ต้องเป็น ACTIVE หรือ INACTIVE";
  }
  if (["max_members_per_workspace", "otp_rate_limit_seconds", "activity_log_retention_days"].includes(key)) {
    const number = Number(value);
    if (!Number.isInteger(number) || number < 0) return `${key} ต้องเป็นเลขจำนวนเต็ม 0 ขึ้นไป`;
    if (key === "max_members_per_workspace" && number < 1) return "max_members_per_workspace ต้องอย่างน้อย 1";
  }
  return null;
}

export async function getSuperAdminOverviewAction() {
  try {
    await requireSuperAdmin();

    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    const [
      totalWorkspaces,
      totalUsers,
      activeUsers,
      superAdmins,
      totalMembers,
      activeRounds,
      totalRounds,
      paymentTotals,
      todayPaymentTotals,
      outstandingTotals,
      recentWorkspaces,
      recentUsers,
      allWorkspaces,
      platformUsers,
      recentTransactions,
      recentActivityLogs,
      workspacePaymentGroups,
      workspaceOutstandingGroups,
      workspaceMemberGroups,
    ] = await Promise.all([
      prisma.workspace.count(),
      prisma.user.count(),
      prisma.user.count({ where: { status: "ACTIVE" } }),
      prisma.user.count({ where: { role: "SUPER_ADMIN", status: "ACTIVE" } }),
      prisma.member.count(),
      prisma.collectionRound.count({ where: { status: "OPEN" } }),
      prisma.collectionRound.count(),
      prisma.paymentTransaction.aggregate({
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.paymentTransaction.aggregate({
        where: { paidAt: { gte: todayStart, lte: todayEnd } },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.memberRound.aggregate({
        where: { remainingAmount: { gt: 0 } },
        _sum: { remainingAmount: true },
        _count: { _all: true },
      }),
      prisma.workspace.findMany({
        select: {
          id: true,
          name: true,
          description: true,
          createdAt: true,
          updatedAt: true,
          owner: { select: { id: true, fullName: true, username: true, email: true } },
          _count: {
            select: {
              workspaceMembers: true,
              members: true,
              rounds: true,
              paymentTransactions: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.user.findMany({
        select: {
          id: true,
          username: true,
          email: true,
          fullName: true,
          role: true,
          status: true,
          createdAt: true,
          cancelledAt: true,
          _count: { select: { workspaceMemberships: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.workspace.findMany({
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          memberCardToken: true,
          createdAt: true,
          updatedAt: true,
          owner: { select: { id: true, fullName: true, username: true, email: true } },
          _count: {
            select: {
              workspaceMembers: true,
              members: true,
              rounds: true,
              paymentTransactions: true,
            },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 8,
      }),
      prisma.user.findMany({
        select: {
          id: true,
          username: true,
          email: true,
          fullName: true,
          role: true,
          status: true,
          createdAt: true,
          cancelledAt: true,
          restoreUntil: true,
          _count: { select: { workspaceMemberships: true, activityLogs: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 8,
      }),
      prisma.paymentTransaction.findMany({
        select: {
          id: true,
          amount: true,
          paidAt: true,
          workspace: { select: { id: true, name: true } },
          member: { select: { id: true, fullName: true, memberCode: true } },
          round: { select: { id: true, title: true } },
          paymentMethod: { select: { id: true, name: true, type: true } },
          collectedBy: { select: { id: true, fullName: true, username: true } },
        },
        orderBy: { paidAt: "desc" },
        take: 5,
      }),
      prisma.activityLog.findMany({
        select: {
          id: true,
          action: true,
          detail: true,
          outcome: true,
          ipAddress: true,
          path: true,
          createdAt: true,
          workspace: { select: { id: true, name: true } },
          user: { select: { id: true, fullName: true, username: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
      prisma.paymentTransaction.groupBy({
        by: ["workspaceId"],
        _sum: { amount: true },
        _count: { _all: true },
        orderBy: { _sum: { amount: "desc" } },
        take: 6,
      }),
      prisma.memberRound.groupBy({
        by: ["workspaceId"],
        where: { remainingAmount: { gt: 0 } },
        _sum: { remainingAmount: true },
        _count: { _all: true },
        orderBy: { _sum: { remainingAmount: "desc" } },
        take: 6,
      }),
      prisma.member.groupBy({
        by: ["workspaceId"],
        _count: { _all: true },
        orderBy: { _count: { workspaceId: "desc" } },
        take: 6,
      }),
    ]);

    const workspaceIds = Array.from(
      new Set([
        ...workspacePaymentGroups.map((item) => item.workspaceId),
        ...workspaceOutstandingGroups.map((item) => item.workspaceId),
        ...workspaceMemberGroups.map((item) => item.workspaceId),
      ]),
    );
    const workspaces = await prisma.workspace.findMany({
      where: { id: { in: workspaceIds } },
      select: { id: true, name: true },
    });
    const workspaceNames = new Map(workspaces.map((workspace) => [workspace.id, workspace.name]));

    return successResult({
      totals: {
        totalWorkspaces,
        totalUsers,
        activeUsers,
        inactiveUsers: totalUsers - activeUsers,
        superAdmins,
        totalMembers,
        activeRounds,
        totalRounds,
        totalPaidAmount: paymentTotals._sum.amount ?? 0,
        totalTransactionCount: paymentTotals._count._all,
        todayPaidAmount: todayPaymentTotals._sum.amount ?? 0,
        todayTransactionCount: todayPaymentTotals._count._all,
        totalOutstandingAmount: outstandingTotals._sum.remainingAmount ?? 0,
        outstandingMemberRoundCount: outstandingTotals._count._all,
      },
      recentWorkspaces,
      recentUsers,
      workspaces: allWorkspaces,
      users: platformUsers,
      recentTransactions,
      recentActivityLogs,
      topWorkspacesByPaid: workspacePaymentGroups.map((item) => ({
        workspaceId: item.workspaceId,
        workspaceName: workspaceNames.get(item.workspaceId) ?? "Unknown workspace",
        totalPaidAmount: item._sum.amount ?? 0,
        transactionCount: item._count._all,
      })),
      topWorkspacesByOutstanding: workspaceOutstandingGroups.map((item) => ({
        workspaceId: item.workspaceId,
        workspaceName: workspaceNames.get(item.workspaceId) ?? "Unknown workspace",
        totalOutstandingAmount: item._sum.remainingAmount ?? 0,
        memberRoundCount: item._count._all,
      })),
      topWorkspacesByMembers: workspaceMemberGroups.map((item) => ({
        workspaceId: item.workspaceId,
        workspaceName: workspaceNames.get(item.workspaceId) ?? "Unknown workspace",
        memberCount: item._count._all,
      })),
    });
  } catch (error) {
    return errorResult(error instanceof Error ? error.message : "ไม่สามารถดึงข้อมูลระบบกลางได้");
  }
}

export async function getAdminWorkspacesAction(
  filters: {
    q?: string;
    status?: string;
    from?: string;
    to?: string;
    minMembers?: string;
    maxMembers?: string;
    minOutstanding?: string;
    maxOutstanding?: string;
    page?: string;
    pageSize?: string;
  } = {},
) {
  await requireSuperAdmin();
  const q = filters.q?.trim();
  const from = parseDateInput(filters.from);
  const to = parseDateInput(filters.to);
  const minMembers = parseNumberInput(filters.minMembers);
  const maxMembers = parseNumberInput(filters.maxMembers);
  const minOutstanding = parseNumberInput(filters.minOutstanding);
  const maxOutstanding = parseNumberInput(filters.maxOutstanding);
  const { page, pageSize, skip } = getPagination(filters);
  const status: "ACTIVE" | "INACTIVE" | undefined = filters.status === "ACTIVE" || filters.status === "INACTIVE" ? filters.status : undefined;
  const hasDateFilter = from !== undefined || to !== undefined;
  const hasAggregateFilter = minMembers !== undefined || maxMembers !== undefined || minOutstanding !== undefined || maxOutstanding !== undefined;
  const where = {
    ...(status ? { status } : {}),
    ...(hasDateFilter
      ? {
          createdAt: {
            ...(from ? { gte: startOfDay(from) } : {}),
            ...(to ? { lte: endOfDay(to) } : {}),
          },
        }
      : {}),
    ...(q
      ? {
          OR: [
            { name: containsInsensitive(q) },
            { description: containsInsensitive(q) },
            { owner: { fullName: containsInsensitive(q) } },
            { owner: { username: containsInsensitive(q) } },
            { owner: { email: containsInsensitive(q) } },
          ],
        }
      : {}),
  };

  const workspaceSelect = {
      id: true,
      name: true,
      description: true,
      status: true,
      memberCardToken: true,
      createdAt: true,
      updatedAt: true,
      owner: { select: { id: true, fullName: true, username: true, email: true } },
      activityLogs: { select: { createdAt: true }, orderBy: { createdAt: "desc" }, take: 1 },
      _count: { select: { workspaceMembers: true, members: true, rounds: true, paymentTransactions: true } },
    } as const;

  const [workspaces, baseTotal] = await Promise.all([
    hasAggregateFilter
      ? prisma.workspace.findMany({
          where,
          select: workspaceSelect,
          orderBy: { updatedAt: "desc" },
          take: 500,
        })
      : prisma.workspace.findMany({
          where,
          select: workspaceSelect,
          orderBy: { updatedAt: "desc" },
          skip,
          take: pageSize,
        }),
    hasAggregateFilter ? Promise.resolve(0) : prisma.workspace.count({ where }),
  ]);

  const workspaceIds = workspaces.map((workspace) => workspace.id);
  const [outstandingGroups, paymentGroups] = workspaceIds.length
    ? await Promise.all([
        prisma.memberRound.groupBy({
          by: ["workspaceId"],
          where: { workspaceId: { in: workspaceIds }, remainingAmount: { gt: 0 } },
          _sum: { remainingAmount: true },
          _count: { _all: true },
        }),
        prisma.paymentTransaction.groupBy({
          by: ["workspaceId"],
          where: { workspaceId: { in: workspaceIds } },
          _sum: { amount: true },
          _count: { _all: true },
        }),
      ])
    : [[], []];

  const outstandingByWorkspace = new Map(outstandingGroups.map((row) => [row.workspaceId, { amount: row._sum.remainingAmount ?? 0, count: row._count._all }]));
  const paymentByWorkspace = new Map(paymentGroups.map((row) => [row.workspaceId, { amount: row._sum.amount ?? 0, count: row._count._all }]));

  const rows = workspaces
    .map((workspace) => ({
      ...workspace,
      lastActivityAt: workspace.activityLogs[0]?.createdAt ?? null,
      outstanding: outstandingByWorkspace.get(workspace.id) ?? { amount: 0, count: 0 },
      payments: paymentByWorkspace.get(workspace.id) ?? { amount: 0, count: 0 },
      health: {
        inactiveDays: workspace.activityLogs[0]?.createdAt ? Math.floor((Date.now() - workspace.activityLogs[0].createdAt.getTime()) / 86_400_000) : null,
        highOutstanding: (outstandingByWorkspace.get(workspace.id)?.amount ?? 0) >= 10000,
        noRecentActivity: !workspace.activityLogs[0] || Date.now() - workspace.activityLogs[0].createdAt.getTime() > 30 * 86_400_000,
      },
    }))
    .filter((workspace) => {
      if (!hasAggregateFilter) return true;
      const members = workspace._count.members;
      const outstandingAmount = workspace.outstanding.amount;
      if (minMembers !== undefined && members < minMembers) return false;
      if (maxMembers !== undefined && members > maxMembers) return false;
      if (minOutstanding !== undefined && outstandingAmount < minOutstanding) return false;
      if (maxOutstanding !== undefined && outstandingAmount > maxOutstanding) return false;
      return true;
    });

  if (!hasAggregateFilter) return successResult({ rows, pagination: { page, pageSize, total: baseTotal } });

  return successResult(paginateRows(rows, page, pageSize));
}

export async function getAdminWorkspaceDetailAction(data: unknown) {
  try {
    await requireSuperAdmin();
    const parsed = workspaceIdSchema.safeParse(data);
    if (!parsed.success) return errorResult("ข้อมูล workspace ไม่ถูกต้อง", parsed.error.flatten().fieldErrors);

    const workspace = await prisma.workspace.findUnique({
      where: { id: parsed.data.workspaceId },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        memberCardToken: true,
        createdAt: true,
        updatedAt: true,
        owner: { select: { id: true, fullName: true, username: true, email: true, status: true } },
        workspaceMembers: {
          select: {
            id: true,
            role: true,
            status: true,
            createdAt: true,
            user: { select: { id: true, fullName: true, username: true, email: true, role: true, status: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 50,
        },
        rounds: {
          select: {
            id: true,
            title: true,
            status: true,
            targetAmount: true,
            startDate: true,
            dueDate: true,
            _count: { select: { memberRounds: true, paymentTransactions: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
        paymentTransactions: {
          select: {
            id: true,
            amount: true,
            paidAt: true,
            member: { select: { id: true, fullName: true, memberCode: true } },
            round: { select: { id: true, title: true } },
            paymentMethod: { select: { id: true, name: true } },
            collectedBy: { select: { id: true, fullName: true, username: true } },
          },
          orderBy: { paidAt: "desc" },
          take: 20,
        },
        activityLogs: {
          select: {
            id: true,
            action: true,
            detail: true,
            outcome: true,
            ipAddress: true,
            path: true,
            createdAt: true,
            user: { select: { id: true, fullName: true, username: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 30,
        },
        _count: {
          select: {
            workspaceMembers: true,
            members: true,
            rounds: true,
            paymentTransactions: true,
            paymentMethods: true,
            notifications: true,
          },
        },
      },
    });

    if (!workspace) return errorResult("ไม่พบ workspace");

    const [
      paymentTotals,
      outstandingTotals,
      memberStatusGroups,
      roundStatusGroups,
      memberCodeRows,
      hiddenOpenOutstandingRows,
      roundMemberAuditLogs,
    ] = await Promise.all([
      prisma.paymentTransaction.aggregate({
        where: { workspaceId: workspace.id },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.memberRound.aggregate({
        where: { workspaceId: workspace.id, remainingAmount: { gt: 0 } },
        _sum: { remainingAmount: true },
        _count: { _all: true },
      }),
      prisma.member.groupBy({
        by: ["status"],
        where: { workspaceId: workspace.id },
        _count: { _all: true },
      }),
      prisma.collectionRound.groupBy({
        by: ["status"],
        where: { workspaceId: workspace.id },
        _count: { _all: true },
      }),
      prisma.member.findMany({
        where: { workspaceId: workspace.id },
        select: { id: true, memberCode: true, fullName: true, status: true, updatedAt: true },
        orderBy: [{ memberCode: "asc" }, { updatedAt: "desc" }],
      }),
      prisma.memberRound.findMany({
        where: {
          workspaceId: workspace.id,
          remainingAmount: { gt: 0 },
          round: { status: "OPEN" },
          member: { status: "HIDDEN" },
        },
        select: {
          id: true,
          remainingAmount: true,
          status: true,
          member: { select: { id: true, memberCode: true, fullName: true, status: true } },
          round: { select: { id: true, title: true, status: true } },
        },
        orderBy: { remainingAmount: "desc" },
        take: 20,
      }),
      prisma.activityLog.findMany({
        where: { workspaceId: workspace.id, action: "UPDATE_ROUND_MEMBERS" },
        select: {
          id: true,
          action: true,
          detail: true,
          outcome: true,
          createdAt: true,
          user: { select: { id: true, fullName: true, username: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    const memberCodeGroups = new Map<string, typeof memberCodeRows>();
    for (const member of memberCodeRows) {
      const rows = memberCodeGroups.get(member.memberCode) ?? [];
      rows.push(member);
      memberCodeGroups.set(member.memberCode, rows);
    }
    const duplicateMemberCodes = Array.from(memberCodeGroups.entries())
      .filter(([, rows]) => rows.length > 1)
      .map(([memberCode, rows]) => ({
        memberCode,
        total: rows.length,
        activeCount: rows.filter((row) => row.status === "ACTIVE").length,
        hiddenCount: rows.filter((row) => row.status === "HIDDEN").length,
        members: rows.slice(0, 5),
      }))
      .slice(0, 20);

    return successResult({
      workspace,
      totals: {
        paidAmount: paymentTotals._sum.amount ?? 0,
        paymentCount: paymentTotals._count._all,
        outstandingAmount: outstandingTotals._sum.remainingAmount ?? 0,
        outstandingCount: outstandingTotals._count._all,
      },
      memberStatusGroups: memberStatusGroups.map((row) => ({ status: row.status, count: row._count._all })),
      roundStatusGroups: roundStatusGroups.map((row) => ({ status: row.status, count: row._count._all })),
      audit: {
        duplicateMemberCodes,
        hiddenOpenOutstandingRows,
        roundMemberAuditLogs,
        hiddenOpenOutstandingTotal: hiddenOpenOutstandingRows.reduce((sum, row) => sum + row.remainingAmount, 0),
      },
    });
  } catch (error) {
    return errorResult(error instanceof Error ? error.message : "ไม่สามารถดึงรายละเอียด workspace ได้");
  }
}

export async function getAdminUsersAction(
  filters: { q?: string; status?: string; role?: string; minWorkspaces?: string; maxWorkspaces?: string; page?: string; pageSize?: string } = {},
) {
  await requireSuperAdmin();
  const q = filters.q?.trim();
  const status: "ACTIVE" | "INACTIVE" | undefined = filters.status === "ACTIVE" || filters.status === "INACTIVE" ? filters.status : undefined;
  const role: "USER" | "SUPER_ADMIN" | undefined = filters.role === "USER" || filters.role === "SUPER_ADMIN" ? filters.role : undefined;
  const minWorkspaces = parseNumberInput(filters.minWorkspaces);
  const maxWorkspaces = parseNumberInput(filters.maxWorkspaces);
  const { page, pageSize, skip } = getPagination(filters);
  const hasWorkspaceCountFilter = minWorkspaces !== undefined || maxWorkspaces !== undefined;
  const where = {
    ...(status ? { status } : {}),
    ...(role ? { role } : {}),
    ...(q
      ? {
          OR: [
            { username: containsInsensitive(q) },
            { email: containsInsensitive(q) },
            { fullName: containsInsensitive(q) },
          ],
        }
      : {}),
  };
  const userSelect = {
    id: true,
    username: true,
    email: true,
    fullName: true,
    role: true,
    status: true,
    createdAt: true,
    cancelledAt: true,
    restoreUntil: true,
    workspaceMemberships: {
      select: { role: true, status: true, workspace: { select: { id: true, name: true, status: true } } },
      orderBy: { createdAt: "desc" },
      take: 8,
    },
    activityLogs: {
      select: { id: true, action: true, outcome: true, ipAddress: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    },
    _count: { select: { workspaceMemberships: true, activityLogs: true } },
  } as const;

  const [users, baseTotal] = await Promise.all([
    hasWorkspaceCountFilter
      ? prisma.user.findMany({ where, select: userSelect, orderBy: { updatedAt: "desc" }, take: 500 })
      : prisma.user.findMany({ where, select: userSelect, orderBy: { updatedAt: "desc" }, skip, take: pageSize }),
    hasWorkspaceCountFilter ? Promise.resolve(0) : prisma.user.count({ where }),
  ]);

  const rows = users.filter((user) => {
    if (!hasWorkspaceCountFilter) return true;
    const workspaceCount = user._count.workspaceMemberships;
    if (minWorkspaces !== undefined && workspaceCount < minWorkspaces) return false;
    if (maxWorkspaces !== undefined && workspaceCount > maxWorkspaces) return false;
    return true;
  });

  if (!hasWorkspaceCountFilter) return successResult({ rows, pagination: { page, pageSize, total: baseTotal } });

  return successResult(paginateRows(rows, page, pageSize));
}

export async function getAdminUserDetailAction(data: unknown) {
  try {
    await requireSuperAdmin();
    const parsed = userIdSchema.safeParse(data);
    if (!parsed.success) return errorResult("ข้อมูลผู้ใช้ไม่ถูกต้อง", parsed.error.flatten().fieldErrors);

    const user = await prisma.user.findUnique({
      where: { id: parsed.data.userId },
      select: {
        id: true,
        username: true,
        email: true,
        emailVerifiedAt: true,
        fullName: true,
        role: true,
        status: true,
        termsAcceptedAt: true,
        privacyAcceptedAt: true,
        cancelledAt: true,
        restoreUntil: true,
        anonymizedAt: true,
        createdAt: true,
        updatedAt: true,
        workspaceMemberships: {
          select: {
            id: true,
            role: true,
            status: true,
            cancelledAt: true,
            createdAt: true,
            workspace: {
              select: {
                id: true,
                name: true,
                status: true,
                owner: { select: { id: true, fullName: true, username: true } },
                _count: { select: { members: true, rounds: true, paymentTransactions: true } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        ownedWorkspaces: {
          select: {
            id: true,
            name: true,
            status: true,
            createdAt: true,
            _count: { select: { workspaceMembers: true, members: true, rounds: true, paymentTransactions: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        collectedTransactions: {
          select: {
            id: true,
            amount: true,
            paidAt: true,
            workspace: { select: { id: true, name: true } },
            member: { select: { id: true, fullName: true, memberCode: true } },
            round: { select: { id: true, title: true } },
            paymentMethod: { select: { id: true, name: true } },
          },
          orderBy: { paidAt: "desc" },
          take: 20,
        },
        activityLogs: {
          select: {
            id: true,
            action: true,
            detail: true,
            outcome: true,
            ipAddress: true,
            path: true,
            createdAt: true,
            workspace: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 30,
        },
        notifications: {
          select: {
            id: true,
            title: true,
            message: true,
            type: true,
            readAt: true,
            createdAt: true,
            workspace: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
        _count: {
          select: {
            workspaceMemberships: true,
            ownedWorkspaces: true,
            collectedTransactions: true,
            activityLogs: true,
            notifications: true,
          },
        },
      },
    });

    if (!user) return errorResult("ไม่พบผู้ใช้");

    const collectedTotal = await prisma.paymentTransaction.aggregate({
      where: { collectedById: user.id },
      _sum: { amount: true },
      _count: { _all: true },
    });

    return successResult({
      user,
      collectedTotal: {
        amount: collectedTotal._sum.amount ?? 0,
        count: collectedTotal._count._all,
      },
    });
  } catch (error) {
    return errorResult(error instanceof Error ? error.message : "ไม่สามารถดึงรายละเอียดผู้ใช้ได้");
  }
}

export async function getAdminFinanceAction(
  filters: {
    q?: string;
    workspaceId?: string;
    from?: string;
    to?: string;
    methodId?: string;
    collectorId?: string;
    minAmount?: string;
    maxAmount?: string;
    page?: string;
    pageSize?: string;
  } = {},
) {
  await requireSuperAdmin();
  const q = filters.q?.trim();
  const from = parseDateInput(filters.from);
  const to = parseDateInput(filters.to);
  const minAmount = parseNumberInput(filters.minAmount);
  const maxAmount = parseNumberInput(filters.maxAmount);
  const { page, pageSize, skip } = getPagination(filters);
  const hasAmountFilter = minAmount !== undefined || maxAmount !== undefined;
  const hasDateFilter = from !== undefined || to !== undefined;
  const where = {
    ...(filters.workspaceId ? { workspaceId: filters.workspaceId } : {}),
    ...(filters.methodId ? { paymentMethodId: filters.methodId } : {}),
    ...(filters.collectorId ? { collectedById: filters.collectorId } : {}),
    ...(hasAmountFilter
      ? {
          amount: {
            ...(minAmount !== undefined ? { gte: minAmount } : {}),
            ...(maxAmount !== undefined ? { lte: maxAmount } : {}),
          },
        }
      : {}),
    ...(hasDateFilter
      ? {
          paidAt: {
            ...(from ? { gte: startOfDay(from) } : {}),
            ...(to ? { lte: endOfDay(to) } : {}),
          },
        }
      : {}),
    ...(q
      ? {
          OR: [
            { note: containsInsensitive(q) },
            { workspace: { name: containsInsensitive(q) } },
            { member: { fullName: containsInsensitive(q) } },
            { member: { memberCode: containsInsensitive(q) } },
            { round: { title: containsInsensitive(q) } },
            { paymentMethod: { name: containsInsensitive(q) } },
            { collectedBy: { fullName: containsInsensitive(q) } },
            { collectedBy: { username: containsInsensitive(q) } },
          ],
        }
      : {}),
  };

  const outstandingWhere = {
    remainingAmount: { gt: 0 },
    ...(filters.workspaceId ? { workspaceId: filters.workspaceId } : {}),
    ...(q
      ? {
          OR: [
            { workspace: { name: containsInsensitive(q) } },
            { member: { fullName: containsInsensitive(q) } },
            { member: { memberCode: containsInsensitive(q) } },
            { round: { title: containsInsensitive(q) } },
          ],
        }
      : {}),
  };

  const [transactions, transactionCount, totals, workspaces, methods, collectors, dailyGroups, outstandingGroups, outstandingRows, outstandingCount] = await Promise.all([
    prisma.paymentTransaction.findMany({
      where,
      select: {
        id: true,
        amount: true,
        paidAt: true,
        note: true,
        workspace: { select: { id: true, name: true } },
        member: { select: { id: true, fullName: true, memberCode: true } },
        round: { select: { id: true, title: true } },
        paymentMethod: { select: { id: true, name: true, type: true } },
        collectedBy: { select: { id: true, fullName: true, username: true } },
      },
      orderBy: { paidAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.paymentTransaction.count({ where }),
    prisma.paymentTransaction.aggregate({ where, _sum: { amount: true }, _count: { _all: true } }),
    prisma.workspace.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.paymentMethod.findMany({ select: { id: true, name: true, workspace: { select: { name: true } } }, orderBy: { name: "asc" }, take: 200 }),
    prisma.user.findMany({ where: { collectedTransactions: { some: {} } }, select: { id: true, fullName: true, username: true }, orderBy: { fullName: "asc" }, take: 200 }),
    prisma.paymentTransaction.groupBy({
      by: ["paidAt"],
      where,
      _sum: { amount: true },
      _count: { _all: true },
      orderBy: { paidAt: "asc" },
      take: 500,
    }),
    prisma.memberRound.groupBy({
      by: ["workspaceId"],
      where: outstandingWhere,
      _sum: { remainingAmount: true },
      _count: { _all: true },
      orderBy: { _sum: { remainingAmount: "desc" } },
      take: 10,
    }),
    prisma.memberRound.findMany({
      where: outstandingWhere,
      select: {
        id: true,
        targetAmount: true,
        paidAmount: true,
        remainingAmount: true,
        fineAmount: true,
        totalRequiredAmount: true,
        status: true,
        updatedAt: true,
        workspace: { select: { id: true, name: true } },
        member: { select: { id: true, fullName: true, memberCode: true } },
        round: { select: { id: true, title: true, dueDate: true } },
      },
      orderBy: [{ remainingAmount: "desc" }, { updatedAt: "desc" }],
      skip,
      take: pageSize,
    }),
    prisma.memberRound.count({ where: outstandingWhere }),
  ]);

  const outstandingWorkspaces = await prisma.workspace.findMany({
    where: { id: { in: outstandingGroups.map((row) => row.workspaceId) } },
    select: { id: true, name: true },
  });
  const workspaceNameById = new Map(outstandingWorkspaces.map((workspace) => [workspace.id, workspace.name]));

  return successResult({
    transactions,
    pagination: { page, pageSize, total: Math.max(transactionCount, outstandingCount) },
    totals: { amount: totals._sum.amount ?? 0, count: totals._count._all },
    workspaces,
    methods,
    collectors,
    dailyTotals: dailyGroups.map((row) => ({ date: row.paidAt, amount: row._sum.amount ?? 0, count: row._count._all })),
    outstandingRows,
    outstandingPagination: { page, pageSize, total: outstandingCount },
    topOutstanding: outstandingGroups.map((row) => ({
      workspaceId: row.workspaceId,
      workspaceName: workspaceNameById.get(row.workspaceId) ?? "Unknown workspace",
      amount: row._sum.remainingAmount ?? 0,
      count: row._count._all,
    })),
  });
}

export async function getAdminLogsAction(
  filters: { q?: string; workspaceId?: string; userId?: string; outcome?: string; from?: string; to?: string; page?: string; pageSize?: string } = {},
) {
  await requireSuperAdmin();
  const q = filters.q?.trim();
  const from = parseDateInput(filters.from);
  const to = parseDateInput(filters.to);
  const { page, pageSize, skip } = getPagination(filters);
  const hasDateFilter = from !== undefined || to !== undefined;
  const where = {
    ...(filters.workspaceId ? { workspaceId: filters.workspaceId } : {}),
    ...(filters.userId ? { userId: filters.userId } : {}),
    ...(filters.outcome ? { outcome: filters.outcome } : {}),
    ...(hasDateFilter
      ? {
          createdAt: {
            ...(from ? { gte: startOfDay(from) } : {}),
            ...(to ? { lte: endOfDay(to) } : {}),
          },
        }
      : {}),
    ...(q ? { OR: [{ action: containsInsensitive(q) }, { detail: containsInsensitive(q) }, { ipAddress: containsInsensitive(q) }, { path: containsInsensitive(q) }] } : {}),
  };
  const [logs, logCount, workspaces, users] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      select: {
        id: true,
        action: true,
        detail: true,
        outcome: true,
        ipAddress: true,
        userAgent: true,
        method: true,
        path: true,
        createdAt: true,
        workspace: { select: { id: true, name: true } },
        user: { select: { id: true, fullName: true, username: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.activityLog.count({ where }),
    prisma.workspace.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.user.findMany({ select: { id: true, fullName: true, username: true }, orderBy: { fullName: "asc" }, take: 300 }),
  ]);
  return successResult({ logs, pagination: { page, pageSize, total: logCount }, workspaces, users });
}

async function resolveAnnouncementRecipients(data: z.infer<typeof announcementSchema>) {
  let recipients: Array<{ id: string }> = [];
  let workspaceId: string | null = null;

  if (data.groupId) {
    const members = await prisma.recipientGroupMember.findMany({
      where: { groupId: data.groupId, user: { status: "ACTIVE" } },
      select: { userId: true },
    });
    recipients = members.map((member) => ({ id: member.userId }));
  } else if (data.target === "ALL") {
    recipients = await prisma.user.findMany({ where: { status: "ACTIVE" }, select: { id: true } });
  } else if (data.target === "WORKSPACE") {
    if (!data.workspaceId) throw new Error("กรุณาเลือก workspace");
    workspaceId = data.workspaceId;
    const memberships = await prisma.workspaceMember.findMany({
      where: { workspaceId, status: "ACTIVE", user: { status: "ACTIVE" } },
      select: { userId: true },
    });
    recipients = memberships.map((membership) => ({ id: membership.userId }));
  } else {
    const selectedUserIds = Array.from(new Set([...(data.userIds ?? []), data.userId].filter((id): id is string => !!id)));
    if (selectedUserIds.length === 0) throw new Error("กรุณาเลือกผู้ใช้อย่างน้อย 1 คน");
    recipients = await prisma.user.findMany({
      where: { id: { in: selectedUserIds }, status: "ACTIVE" },
      select: { id: true },
    });
  }

  const uniqueRecipients = Array.from(new Map(recipients.map((recipient) => [recipient.id, recipient])).values());
  if (uniqueRecipients.length === 0) throw new Error("ไม่พบผู้รับประกาศ");
  return { recipients: uniqueRecipients, workspaceId };
}

export async function getAdminAnnouncementsAction() {
  await requireSuperAdmin();
  const [workspaces, users, recentNotifications, templates, recipientGroups, scheduledAnnouncements] = await Promise.all([
    prisma.workspace.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { status: "ACTIVE" }, select: { id: true, fullName: true, username: true, email: true }, orderBy: { fullName: "asc" }, take: 300 }),
    prisma.notification.findMany({
      where: { type: "SYSTEM" },
      select: { id: true, title: true, message: true, readAt: true, createdAt: true, workspace: { select: { name: true } }, user: { select: { fullName: true, username: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.announcementTemplate.findMany({
      select: { id: true, name: true, title: true, message: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
    prisma.recipientGroup.findMany({
      select: { id: true, name: true, description: true, updatedAt: true, _count: { select: { members: true } } },
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
    prisma.scheduledAnnouncement.findMany({
      select: { id: true, target: true, title: true, message: true, scheduledAt: true, sentAt: true, status: true, workspace: { select: { name: true } }, createdBy: { select: { fullName: true, username: true } } },
      orderBy: { scheduledAt: "desc" },
      take: 50,
    }),
  ]);
  return successResult({ workspaces, users, recentNotifications, templates, recipientGroups, scheduledAnnouncements });
}

export async function getAdminSupportAction() {
  try {
    await requireSuperAdmin();
    const [workspaces, sessions, supportLogs] = await Promise.all([
      prisma.workspace.findMany({ select: { id: true, name: true, status: true, owner: { select: { fullName: true, username: true } } }, orderBy: { name: "asc" } }),
      prisma.superAdminSupportSession.findMany({
        select: {
          id: true,
          mode: true,
          status: true,
          reason: true,
          expiresAt: true,
          endedAt: true,
          createdAt: true,
          workspace: { select: { id: true, name: true } },
          actor: { select: { fullName: true, username: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.activityLog.findMany({
        where: { detail: containsInsensitive("[SUPPORT:") },
        select: { id: true, action: true, detail: true, createdAt: true, workspace: { select: { name: true } }, user: { select: { fullName: true, username: true } } },
        orderBy: { createdAt: "desc" },
        take: 80,
      }),
    ]);
    const currentSupportSessionId = await getSupportSessionId();
    return successResult({ workspaces, sessions, supportLogs, currentSupportSessionId });
  } catch (error) {
    return errorResult(error instanceof Error ? error.message : "ไม่สามารถดึงข้อมูล support access ได้");
  }
}

export async function getAdminPlatformSettingsAction() {
  await requireSuperAdmin();
  await prisma.$transaction(
    DEFAULT_PLATFORM_SETTINGS.map((setting) =>
      prisma.platformSetting.upsert({
        where: { key: setting.key },
        update: {},
        create: setting,
      }),
    ),
  );
  const [settings, currentVersion, versions] = await Promise.all([
    prisma.platformSetting.findMany({ orderBy: { key: "asc" } }),
    getCurrentAppVersion(),
    prisma.appVersion.findMany({
      include: { createdBy: { select: { fullName: true, username: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);
  return successResult({
    settings: settings.map((setting) => ({ ...setting, label: setting.label ?? setting.key })),
    defaults: DEFAULT_PLATFORM_SETTINGS,
    currentVersion,
    versions,
  });
}

async function createAppVersionReleaseActionLegacy(data: unknown) {
  try {
    const actor = await requireSuperAdmin();
    const parsed = appVersionSchema.safeParse(data);
    if (!parsed.success) return errorResult("ข้อมูลเวอร์ชันไม่ถูกต้อง", parsed.error.flatten().fieldErrors);

    const nextVersion = parsed.data.version.replace(/^v/i, "");
    if (!parseAppVersion(nextVersion)) return errorResult("กรุณาใช้รูปแบบเวอร์ชันแบบ 1.2.3");

    const currentVersion = await getCurrentAppVersion();
    if (compareAppVersions(nextVersion, currentVersion.version) <= 0) {
      return errorResult(`ไม่สามารถ downgrade หรือใช้เวอร์ชันเดิมได้ เวอร์ชันปัจจุบันคือ ${currentVersion.version}`);
    }

    const duplicate = await prisma.appVersion.findUnique({ where: { version: nextVersion }, select: { id: true } });
    if (duplicate) return errorResult(`เวอร์ชัน ${nextVersion} ถูกประกาศแล้ว`);

    const activeUsers = await prisma.user.findMany({
      where: { status: "ACTIVE" },
      select: { id: true },
    });
    const notificationMessage = `เวอร์ชันใหม่ ${nextVersion}: ${parsed.data.title}\n\n${parsed.data.features}`;

    const release = await prisma.$transaction(async (tx) => {
      const created = await tx.appVersion.create({
        data: {
          version: nextVersion,
          title: parsed.data.title,
          features: parsed.data.features,
          createdById: actor.id,
        },
        include: { createdBy: { select: { fullName: true, username: true } } },
      });

      if (activeUsers.length) {
        await tx.notification.createMany({
          data: activeUsers.map((user) => ({
            userId: user.id,
            type: "SYSTEM" as const,
            title: `SchoolSaver v${nextVersion}`,
            message: notificationMessage,
            linkUrl: "/dashboard",
          })),
        });
      }

      await tx.activityLog.create({
        data: {
          userId: actor.id,
          action: "SUPER_ADMIN_CREATE_APP_VERSION",
          detail: `Published SchoolSaver v${nextVersion}: ${parsed.data.title}`,
        },
      });
      return created;
    });

    revalidatePath("/");
    revalidatePath("/admin/settings");
    revalidatePath("/admin/version-control");
    revalidatePath("/admin/announcements");
    return successResult(release, `ประกาศ SchoolSaver v${nextVersion} แล้ว`);
  } catch (error) {
    return errorResult(error instanceof Error ? error.message : "ไม่สามารถประกาศเวอร์ชันใหม่ได้");
  }
}

export async function createAppVersionReleaseAction(data: unknown) {
  try {
    const actor = await requireSuperAdmin();
    const parsed = appVersionSchema.safeParse(data);
    if (!parsed.success) return errorResult("ข้อมูลเวอร์ชันไม่ถูกต้อง", parsed.error.flatten().fieldErrors);

    const nextVersion = parsed.data.version.replace(/^v/i, "");
    if (!parseAppVersion(nextVersion)) return errorResult("กรุณาใช้รูปแบบเวอร์ชันแบบ 1.2.3");
    const plannedAt = parsed.data.plannedAt ? new Date(parsed.data.plannedAt) : null;
    if (plannedAt && Number.isNaN(plannedAt.getTime())) return errorResult("เวลาที่จะปล่อยเวอร์ชันไม่ถูกต้อง");

    const currentVersion = await getCurrentAppVersion();
    if (compareAppVersions(nextVersion, currentVersion.version) <= 0) {
      return errorResult(`ไม่สามารถวางแผน downgrade หรือใช้เวอร์ชันเดิมได้ เวอร์ชันที่ใช้งานอยู่คือ ${currentVersion.version}`);
    }

    const duplicate = await prisma.appVersion.findUnique({ where: { version: nextVersion }, select: { id: true } });
    if (duplicate) return errorResult(`เวอร์ชัน ${nextVersion} ถูกประกาศแล้ว`);

    const activeUsers = await prisma.user.findMany({
      where: { status: "ACTIVE" },
      select: { id: true },
    });
    const releaseTimeText = plannedAt ? `\nกำหนดปล่อย: ${plannedAt.toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}` : "";
    const notificationMessage = `ประกาศล่วงหน้า: SchoolSaver จะมีเวอร์ชันใหม่ v${nextVersion}${releaseTimeText}\n\n${parsed.data.title}\n\n${parsed.data.features}`;

    const release = await prisma.$transaction(async (tx) => {
      const created = await tx.appVersion.create({
        data: {
          version: nextVersion,
          title: parsed.data.title,
          features: parsed.data.features,
          status: "PLANNED",
          isPublished: false,
          plannedAt,
          createdById: actor.id,
        },
        include: { createdBy: { select: { fullName: true, username: true } } },
      });

      if (activeUsers.length) {
        await tx.notification.createMany({
          data: activeUsers.map((user) => ({
            userId: user.id,
            type: "SYSTEM" as const,
            title: `ประกาศล่วงหน้า SchoolSaver v${nextVersion}`,
            message: notificationMessage,
            linkUrl: "/dashboard",
          })),
        });
      }

      await tx.activityLog.create({
        data: {
          userId: actor.id,
          action: "SUPER_ADMIN_PLAN_APP_VERSION",
          detail: `Planned SchoolSaver v${nextVersion}: ${parsed.data.title}`,
        },
      });
      return created;
    });

    revalidatePath("/");
    revalidatePath("/admin/settings");
    revalidatePath("/admin/version-control");
    revalidatePath("/admin/announcements");
    return successResult(release, `ประกาศล่วงหน้า SchoolSaver v${nextVersion} แล้ว สถานะยังไม่ใช้งาน`);
  } catch (error) {
    return errorResult(error instanceof Error ? error.message : "ไม่สามารถประกาศเวอร์ชันใหม่ได้");
  }
}

export async function activateAppVersionAction(data: unknown) {
  try {
    const actor = await requireSuperAdmin();
    const parsed = appVersionIdSchema.safeParse(data);
    if (!parsed.success) return errorResult("ข้อมูลเวอร์ชันไม่ถูกต้อง", parsed.error.flatten().fieldErrors);

    const target = await prisma.appVersion.findUnique({
      where: { id: parsed.data.id },
      select: { id: true, version: true, title: true, status: true },
    });
    if (!target) return errorResult("ไม่พบเวอร์ชันที่ต้องการเปิดใช้งาน");
    if (target.status === "ACTIVE") return errorResult(`v${target.version} เป็นเวอร์ชันที่ใช้งานอยู่แล้ว`);

    const currentVersion = await getCurrentAppVersion();
    if (compareAppVersions(target.version, currentVersion.version) <= 0) {
      return errorResult(`ไม่สามารถตั้งเวอร์ชันที่ต่ำกว่าหรือเท่ากับเวอร์ชันปัจจุบันได้ เวอร์ชันที่ใช้งานอยู่คือ ${currentVersion.version}`);
    }

    const activatedAt = new Date();
    const activeUsers = await prisma.user.findMany({
      where: { status: "ACTIVE" },
      select: { id: true },
    });

    const release = await prisma.$transaction(async (tx) => {
      await tx.appVersion.updateMany({
        where: { status: "ACTIVE" },
        data: { status: "ARCHIVED", isPublished: false },
      });
      const updated = await tx.appVersion.update({
        where: { id: target.id },
        data: { status: "ACTIVE", isPublished: true, activatedAt },
        include: { createdBy: { select: { fullName: true, username: true } } },
      });

      if (activeUsers.length) {
        await tx.notification.createMany({
          data: activeUsers.map((user) => ({
            userId: user.id,
            type: "SYSTEM" as const,
            title: `SchoolSaver v${target.version} พร้อมใช้งานแล้ว`,
            message: `SchoolSaver v${target.version} ถูกตั้งเป็นเวอร์ชันใช้งานแล้ว\n\n${target.title}`,
            linkUrl: "/dashboard",
          })),
        });
      }

      await tx.activityLog.create({
        data: {
          userId: actor.id,
          action: "SUPER_ADMIN_ACTIVATE_APP_VERSION",
          detail: `Activated SchoolSaver v${target.version}: ${target.title}`,
        },
      });
      return updated;
    });

    revalidatePath("/");
    revalidatePath("/admin/version-control");
    revalidatePath("/admin/announcements");
    return successResult(release, `ตั้ง SchoolSaver v${target.version} เป็นเวอร์ชันใช้งานแล้ว`);
  } catch (error) {
    return errorResult(error instanceof Error ? error.message : "ไม่สามารถเปิดใช้งานเวอร์ชันนี้ได้");
  }
}

export async function getAdminReportsAction() {
  await requireSuperAdmin();
  const [workspaceUsage, userGrowth, paidTotals, outstandingTotals, logTotals] = await Promise.all([
    prisma.workspace.findMany({
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
        _count: { select: { workspaceMembers: true, members: true, rounds: true, paymentTransactions: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
    prisma.user.groupBy({ by: ["status", "role"], _count: { _all: true } }),
    prisma.paymentTransaction.aggregate({ _sum: { amount: true }, _count: { _all: true } }),
    prisma.memberRound.aggregate({ where: { remainingAmount: { gt: 0 } }, _sum: { remainingAmount: true }, _count: { _all: true } }),
    prisma.activityLog.groupBy({ by: ["outcome"], _count: { _all: true } }),
  ]);
  return successResult({ workspaceUsage, userGrowth, paidTotals, outstandingTotals, logTotals });
}

export async function getAdminAuditSecurityCenterAction(
  filters: { q?: string; workspaceId?: string; userId?: string; ip?: string; severity?: string; from?: string; to?: string; page?: string; pageSize?: string } = {},
) {
  await requireSuperAdmin();
  const q = filters.q?.trim();
  const from = parseDateInput(filters.from);
  const to = parseDateInput(filters.to);
  const { page, pageSize, skip } = getPagination(filters);
  const where = {
    ...(filters.workspaceId ? { workspaceId: filters.workspaceId } : {}),
    ...(filters.userId ? { userId: filters.userId } : {}),
    ...(filters.ip ? { ipAddress: containsInsensitive(filters.ip) } : {}),
    ...(filters.severity === "RISK"
      ? {
          OR: [
            { outcome: { in: ["FAILURE", "BLOCKED"] } },
            { action: { in: [...sensitiveAuditActions] } },
            { detail: containsInsensitive("[SUPPORT:") },
          ],
        }
      : {}),
    ...(from || to ? { createdAt: { ...(from ? { gte: startOfDay(from) } : {}), ...(to ? { lte: endOfDay(to) } : {}) } } : {}),
    ...(q ? { OR: [{ action: containsInsensitive(q) }, { detail: containsInsensitive(q) }, { ipAddress: containsInsensitive(q) }, { path: containsInsensitive(q) }] } : {}),
  };

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [events, total, workspaces, users, failedLogins, blockedEvents, supportEntries, resetEvents, roleEvents, failuresByIp] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      select: {
        id: true,
        action: true,
        detail: true,
        outcome: true,
        ipAddress: true,
        userAgent: true,
        method: true,
        path: true,
        createdAt: true,
        workspace: { select: { id: true, name: true } },
        user: { select: { id: true, fullName: true, username: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.activityLog.count({ where }),
    prisma.workspace.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.user.findMany({ select: { id: true, fullName: true, username: true }, orderBy: { fullName: "asc" }, take: 300 }),
    prisma.activityLog.count({ where: { action: { in: ["LOGIN_FAILED", "SECURITY_LOGIN_FAILED"] }, createdAt: { gte: since24h } } }),
    prisma.activityLog.count({ where: { outcome: "BLOCKED", createdAt: { gte: since24h } } }),
    prisma.activityLog.count({ where: { detail: containsInsensitive("[SUPPORT:"), createdAt: { gte: since24h } } }),
    prisma.activityLog.count({ where: { action: "SUPER_ADMIN_RESET_USER_PASSWORD", createdAt: { gte: since24h } } }),
    prisma.activityLog.count({ where: { action: "SUPER_ADMIN_UPDATE_USER_ROLE", createdAt: { gte: since24h } } }),
    prisma.activityLog.groupBy({
      by: ["ipAddress"],
      where: { outcome: { in: ["FAILURE", "BLOCKED"] }, ipAddress: { not: null }, createdAt: { gte: since24h } },
      _count: { _all: true },
      orderBy: { _count: { ipAddress: "desc" } },
      take: 8,
    }),
  ]);

  const riskAlerts = [
    ...failuresByIp.filter((row) => row._count._all >= 5).map((row) => ({ label: `IP ${row.ipAddress}`, detail: `มี failure/block ${row._count._all} ครั้งใน 24 ชั่วโมง`, level: "HIGH" as const })),
    ...(blockedEvents > 0 ? [{ label: "Blocked requests", detail: `${blockedEvents} blocked events ใน 24 ชั่วโมง`, level: "HIGH" as const }] : []),
    ...(supportEntries > 0 ? [{ label: "Support mode activity", detail: `${supportEntries} รายการเกิดระหว่าง support session`, level: "MEDIUM" as const }] : []),
    ...(resetEvents + roleEvents > 0 ? [{ label: "Privileged changes", detail: `Reset password/role change ${resetEvents + roleEvents} ครั้ง`, level: "MEDIUM" as const }] : []),
  ];

  return successResult({
    events,
    pagination: { page, pageSize, total },
    workspaces,
    users,
    metrics: { failedLogins, blockedEvents, supportEntries, resetEvents, roleEvents },
    riskAlerts,
  });
}

export async function getAdminWorkspaceHealthAction(filters: { q?: string; status?: string; health?: string; minScore?: string; maxScore?: string; page?: string; pageSize?: string } = {}) {
  await requireSuperAdmin();
  const q = filters.q?.trim();
  const { page, pageSize } = getPagination(filters);
  const workspaces = await prisma.workspace.findMany({
    where: {
      ...(filters.status === "ACTIVE" || filters.status === "INACTIVE" ? { status: filters.status } : {}),
      ...(q
        ? {
            OR: [
              { name: containsInsensitive(q) },
              { description: containsInsensitive(q) },
              { owner: { fullName: containsInsensitive(q) } },
              { owner: { username: containsInsensitive(q) } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      name: true,
      status: true,
      updatedAt: true,
      owner: { select: { id: true, fullName: true, username: true, status: true } },
      activityLogs: { select: { createdAt: true }, orderBy: { createdAt: "desc" }, take: 1 },
      _count: { select: { workspaceMembers: true, members: true, rounds: true, paymentTransactions: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 1000,
  });
  const workspaceIds = workspaces.map((workspace) => workspace.id);
  const [outstandingGroups, activeRoundGroups, paymentFailureGroups, limits] = workspaceIds.length
    ? await Promise.all([
        prisma.memberRound.groupBy({ by: ["workspaceId"], where: { workspaceId: { in: workspaceIds }, remainingAmount: { gt: 0 } }, _sum: { remainingAmount: true }, _count: { _all: true } }),
        prisma.collectionRound.groupBy({ by: ["workspaceId"], where: { workspaceId: { in: workspaceIds }, status: "OPEN" }, _count: { _all: true } }),
        prisma.activityLog.groupBy({ by: ["workspaceId"], where: { workspaceId: { in: workspaceIds }, outcome: "FAILURE", action: { contains: "PAYMENT" } }, _count: { _all: true } }),
        prisma.workspaceLimit.findMany({ where: { workspaceId: { in: workspaceIds } } }),
      ])
    : [[], [], [], []];
  const outstandingByWorkspace = new Map(outstandingGroups.map((row) => [row.workspaceId, { amount: row._sum.remainingAmount ?? 0, count: row._count._all }]));
  const activeRoundsByWorkspace = new Map(activeRoundGroups.map((row) => [row.workspaceId, row._count._all]));
  const paymentFailuresByWorkspace = new Map(paymentFailureGroups.map((row) => [row.workspaceId, row._count._all]));
  const maxMembersByWorkspace = new Map(limits.filter((limit) => limit.key === "max_members").map((limit) => [limit.workspaceId, limit.value]));

  const minScore = parseNumberInput(filters.minScore);
  const maxScore = parseNumberInput(filters.maxScore);
  const rows = workspaces.map((workspace) => {
    const lastActivityAt = workspace.activityLogs[0]?.createdAt ?? null;
    const inactiveDays = lastActivityAt ? Math.floor((Date.now() - lastActivityAt.getTime()) / 86_400_000) : 999;
    const outstanding = outstandingByWorkspace.get(workspace.id) ?? { amount: 0, count: 0 };
    const maxMembers = maxMembersByWorkspace.get(workspace.id) ?? 500;
    const risks = [
      ...(workspace.owner.status !== "ACTIVE" ? ["OWNER_INACTIVE"] : []),
      ...(inactiveDays >= 30 ? ["STALE_WORKSPACE"] : []),
      ...(workspace._count.members > maxMembers ? ["MEMBER_LIMIT_EXCEEDED"] : []),
      ...(outstanding.amount >= 10000 ? ["HIGH_OUTSTANDING"] : []),
      ...((paymentFailuresByWorkspace.get(workspace.id) ?? 0) > 0 ? ["PAYMENT_ERRORS"] : []),
    ];
    const score = Math.max(0, 100 - risks.length * 18 - (inactiveDays >= 60 ? 10 : 0));
    return {
      ...workspace,
      lastActivityAt,
      inactiveDays,
      activeRounds: activeRoundsByWorkspace.get(workspace.id) ?? 0,
      paymentFailures: paymentFailuresByWorkspace.get(workspace.id) ?? 0,
      outstanding,
      maxMembers,
      risks,
      score,
      statusLabel: score >= 80 ? "HEALTHY" : score >= 55 ? "WATCH" : "RISK",
    };
  }).filter((workspace) => {
    if (filters.health && workspace.statusLabel !== filters.health) return false;
    if (minScore !== undefined && workspace.score < minScore) return false;
    if (maxScore !== undefined && workspace.score > maxScore) return false;
    return true;
  });
  const paginated = paginateRows(rows.sort((a, b) => a.score - b.score), page, pageSize);
  return successResult({
    rows: paginated.rows,
    pagination: paginated.pagination,
    summary: {
      healthy: rows.filter((row) => row.statusLabel === "HEALTHY").length,
      watch: rows.filter((row) => row.statusLabel === "WATCH").length,
      risk: rows.filter((row) => row.statusLabel === "RISK").length,
    },
  });
}

export async function getAdminDataExportsAction() {
  await requireSuperAdmin();
  const [users, workspaces, payments, activityLogs] = await Promise.all([
    prisma.user.count(),
    prisma.workspace.count(),
    prisma.paymentTransaction.count(),
    prisma.activityLog.count(),
  ]);
  return successResult({
    limit: ADMIN_EXPORT_LIMIT,
    exports: [
      { dataset: "users" as const, totalRows: users, ...adminExportDefinitions.users },
      { dataset: "workspaces" as const, totalRows: workspaces, ...adminExportDefinitions.workspaces },
      { dataset: "payments" as const, totalRows: payments, ...adminExportDefinitions.payments },
      { dataset: "activity_logs" as const, totalRows: activityLogs, ...adminExportDefinitions.activity_logs },
    ],
  });
}

async function getAdminExportRows(tx: Prisma.TransactionClient, dataset: keyof typeof adminExportDefinitions) {
  if (dataset === "users") {
    const rows = await tx.user.findMany({
      select: { id: true, username: true, email: true, fullName: true, role: true, status: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: ADMIN_EXPORT_LIMIT,
    });
    return rows.map((user) => ({
      id: user.id,
      username: user.username,
      email: user.email ?? "",
      fullName: user.fullName,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt.toISOString(),
    }));
  }

  if (dataset === "workspaces") {
    const rows = await tx.workspace.findMany({
      select: {
        id: true,
        name: true,
        status: true,
        owner: { select: { fullName: true, username: true } },
        _count: { select: { workspaceMembers: true, members: true, rounds: true, paymentTransactions: true } },
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: ADMIN_EXPORT_LIMIT,
    });
    return rows.map((workspace) => ({
      id: workspace.id,
      name: workspace.name,
      status: workspace.status,
      owner: workspace.owner.fullName || workspace.owner.username,
      users: workspace._count.workspaceMembers,
      members: workspace._count.members,
      rounds: workspace._count.rounds,
      payments: workspace._count.paymentTransactions,
      createdAt: workspace.createdAt.toISOString(),
    }));
  }

  if (dataset === "payments") {
    const rows = await tx.paymentTransaction.findMany({
      select: {
        id: true,
        amount: true,
        paidAt: true,
        workspace: { select: { name: true } },
        member: { select: { fullName: true, memberCode: true } },
        round: { select: { title: true } },
        collectedBy: { select: { fullName: true, username: true } },
      },
      orderBy: { paidAt: "desc" },
      take: ADMIN_EXPORT_LIMIT,
    });
    return rows.map((payment) => ({
      id: payment.id,
      workspace: payment.workspace.name,
      member: `${payment.member.fullName} (${payment.member.memberCode})`,
      round: payment.round.title,
      amount: payment.amount,
      collectedBy: payment.collectedBy.fullName || payment.collectedBy.username,
      paidAt: payment.paidAt.toISOString(),
    }));
  }

  const rows = await tx.activityLog.findMany({
    select: { id: true, action: true, outcome: true, detail: true, ipAddress: true, path: true, createdAt: true, workspace: { select: { name: true } }, user: { select: { fullName: true, username: true } } },
    orderBy: { createdAt: "desc" },
    take: ADMIN_EXPORT_LIMIT,
  });
  return rows.map((log) => ({
    id: log.id,
    action: log.action,
    outcome: log.outcome,
    workspace: log.workspace?.name ?? "ทั้งแพลตฟอร์ม",
    user: log.user?.fullName ?? log.user?.username ?? "ระบบ",
    ip: log.ipAddress ?? "",
    path: log.path ?? "",
    detail: log.detail ?? "",
    createdAt: log.createdAt.toISOString(),
  }));
}

async function countAdminExportRows(tx: Prisma.TransactionClient, dataset: keyof typeof adminExportDefinitions) {
  if (dataset === "users") return tx.user.count();
  if (dataset === "workspaces") return tx.workspace.count();
  if (dataset === "payments") return tx.paymentTransaction.count();
  return tx.activityLog.count();
}

export async function createAdminDataExportAction(data: unknown) {
  try {
    const actor = await requireSuperAdmin();
    const parsed = adminExportDatasetSchema.safeParse(data);
    if (!parsed.success) return errorResult("ข้อมูล export ไม่ถูกต้อง", parsed.error.flatten().fieldErrors);
    const dataset = parsed.data.dataset;
    const definition = adminExportDefinitions[dataset];

    const result = await prisma.$transaction(async (tx) => {
      const totalRows = await countAdminExportRows(tx, dataset);
      const rows = await getAdminExportRows(tx, dataset);
      const auditLog = await tx.activityLog.create({
        data: {
          userId: actor.id,
          action: "SUPER_ADMIN_EXPORT_DATA",
          detail: `Export ${definition.label} (${rows.length}/${totalRows} rows, limit ${ADMIN_EXPORT_LIMIT})`,
        },
        select: { id: true, createdAt: true },
      });

      return { rows, totalRows, auditLog };
    });

    return successResult(
      {
        dataset,
        label: definition.label,
        filename: definition.filename,
        rows: result.rows,
        auditLogId: result.auditLog.id,
        exportedAt: result.auditLog.createdAt.toISOString(),
        limit: ADMIN_EXPORT_LIMIT,
        totalRows: result.totalRows,
        exportedRows: result.rows.length,
        truncated: result.totalRows > result.rows.length,
      },
      result.totalRows > result.rows.length
        ? `ส่งออก ${definition.label} ${result.rows.length.toLocaleString("th-TH")} จาก ${result.totalRows.toLocaleString("th-TH")} แถวล่าสุด`
        : `ส่งออก ${definition.label} ${result.rows.length.toLocaleString("th-TH")} แถว`,
    );
  } catch (error) {
    return errorResult(error instanceof Error ? error.message : "ไม่สามารถส่งออกข้อมูลได้");
  }
}

export async function getAdminPlatformControlsAction(filters: { q?: string; status?: string; page?: string; pageSize?: string } = {}) {
  await requireSuperAdmin();
  const q = filters.q?.trim();
  const { page, pageSize, skip } = getPagination(filters);
  const status: "ACTIVE" | "INACTIVE" | undefined = filters.status === "ACTIVE" || filters.status === "INACTIVE" ? filters.status : undefined;
  const where = {
    ...(status ? { status } : {}),
    ...(q ? { OR: [{ name: containsInsensitive(q) }, { owner: { fullName: containsInsensitive(q) } }, { owner: { username: containsInsensitive(q) } }] } : {}),
  };
  const [settingsResult, workspaces] = await Promise.all([
    getAdminPlatformSettingsAction(),
    prisma.workspace.findMany({
      where,
      select: {
        id: true,
        name: true,
        status: true,
        featureFlags: true,
        limits: true,
        _count: { select: { members: true, workspaceMembers: true, rounds: true } },
      },
      orderBy: { name: "asc" },
      skip,
      take: pageSize,
    }),
  ]);
  if (!settingsResult.success) return errorResult(settingsResult.message);
  const total = await prisma.workspace.count({ where });
  return successResult({ ...settingsResult.data, workspaces, pagination: { page, pageSize, total }, defaultFeatureFlags: [...defaultFeatureFlags], defaultWorkspaceLimits: [...defaultWorkspaceLimits] });
}

export async function upsertWorkspaceFeatureFlagAction(data: unknown) {
  try {
    const actor = await requireSuperAdmin();
    const parsed = workspaceFeatureFlagSchema.safeParse(data);
    if (!parsed.success) return errorResult("ข้อมูล feature flag ไม่ถูกต้อง", parsed.error.flatten().fieldErrors);
    const flag = await prisma.workspaceFeatureFlag.upsert({
      where: { workspaceId_key: { workspaceId: parsed.data.workspaceId, key: parsed.data.key } },
      update: { enabled: parsed.data.enabled, note: parsed.data.note, updatedBy: actor.id },
      create: { workspaceId: parsed.data.workspaceId, key: parsed.data.key, enabled: parsed.data.enabled, note: parsed.data.note, updatedBy: actor.id },
    });
    await prisma.activityLog.create({ data: { workspaceId: parsed.data.workspaceId, userId: actor.id, action: "SUPER_ADMIN_UPDATE_WORKSPACE_FEATURE_FLAG", detail: `${parsed.data.key} = ${parsed.data.enabled}` } });
    revalidatePath("/admin/platform");
    return successResult(flag, "บันทึก feature flag แล้ว");
  } catch (error) {
    return errorResult(error instanceof Error ? error.message : "ไม่สามารถบันทึก feature flag ได้");
  }
}

export async function upsertWorkspaceLimitAction(data: unknown) {
  try {
    const actor = await requireSuperAdmin();
    const parsed = workspaceLimitSchema.safeParse(data);
    if (!parsed.success) return errorResult("ข้อมูล limit ไม่ถูกต้อง", parsed.error.flatten().fieldErrors);
    const limit = await prisma.workspaceLimit.upsert({
      where: { workspaceId_key: { workspaceId: parsed.data.workspaceId, key: parsed.data.key } },
      update: { value: parsed.data.value, note: parsed.data.note, updatedBy: actor.id },
      create: { workspaceId: parsed.data.workspaceId, key: parsed.data.key, value: parsed.data.value, note: parsed.data.note, updatedBy: actor.id },
    });
    await prisma.activityLog.create({ data: { workspaceId: parsed.data.workspaceId, userId: actor.id, action: "SUPER_ADMIN_UPDATE_WORKSPACE_LIMIT", detail: `${parsed.data.key} = ${parsed.data.value}` } });
    revalidatePath("/admin/platform");
    return successResult(limit, "บันทึก limit แล้ว");
  } catch (error) {
    return errorResult(error instanceof Error ? error.message : "ไม่สามารถบันทึก limit ได้");
  }
}

export async function getAdminBillingUsageAction(filters: { q?: string; status?: string; minMembers?: string; maxMembers?: string; minTransactions?: string; maxTransactions?: string; page?: string; pageSize?: string } = {}) {
  await requireSuperAdmin();
  const q = filters.q?.trim();
  const { page, pageSize, skip } = getPagination(filters);
  const status: "ACTIVE" | "INACTIVE" | undefined = filters.status === "ACTIVE" || filters.status === "INACTIVE" ? filters.status : undefined;
  const minMembers = parseNumberInput(filters.minMembers);
  const maxMembers = parseNumberInput(filters.maxMembers);
  const minTransactions = parseNumberInput(filters.minTransactions);
  const maxTransactions = parseNumberInput(filters.maxTransactions);
  const hasAggregateFilter = minMembers !== undefined || maxMembers !== undefined || minTransactions !== undefined || maxTransactions !== undefined;
  const where = {
    ...(status ? { status } : {}),
    ...(q ? { OR: [{ name: containsInsensitive(q) }, { owner: { fullName: containsInsensitive(q) } }, { owner: { username: containsInsensitive(q) } }] } : {}),
  };
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const workspaceUsageQuery = {
    where,
    select: {
      id: true,
      name: true,
      status: true,
      owner: { select: { fullName: true, username: true } },
      _count: { select: { workspaceMembers: true, members: true, rounds: true, paymentTransactions: true } },
    },
    orderBy: { updatedAt: "desc" as const },
  };
  const [totals, workspaceUsage, monthlyTransactions, monthlyPaid] = await Promise.all([
    {
      activeWorkspaces: await prisma.workspace.count({ where: { status: "ACTIVE" } }),
      activeUsers: await prisma.user.count({ where: { status: "ACTIVE" } }),
      members: await prisma.member.count({ where: { status: "ACTIVE" } }),
    },
    hasAggregateFilter ? prisma.workspace.findMany({ ...workspaceUsageQuery, take: 1000 }) : prisma.workspace.findMany({ ...workspaceUsageQuery, skip, take: pageSize }),
    prisma.paymentTransaction.groupBy({ by: ["workspaceId"], where: { paidAt: { gte: monthStart } }, _count: { _all: true }, _sum: { amount: true } }),
    prisma.paymentTransaction.aggregate({ where: { paidAt: { gte: monthStart } }, _sum: { amount: true }, _count: { _all: true } }),
  ]);
  const monthByWorkspace = new Map(monthlyTransactions.map((row) => [row.workspaceId, { count: row._count._all, amount: row._sum.amount ?? 0 }]));
  const filteredRows = workspaceUsage.map((workspace) => ({ ...workspace, monthly: monthByWorkspace.get(workspace.id) ?? { count: 0, amount: 0 }, plan: "FREE" })).filter((workspace) => {
    if (minMembers !== undefined && workspace._count.members < minMembers) return false;
    if (maxMembers !== undefined && workspace._count.members > maxMembers) return false;
    if (minTransactions !== undefined && workspace._count.paymentTransactions < minTransactions) return false;
    if (maxTransactions !== undefined && workspace._count.paymentTransactions > maxTransactions) return false;
    return true;
  });
  const rows = hasAggregateFilter ? paginateRows(filteredRows, page, pageSize).rows : filteredRows;
  return successResult({
    totals: { ...totals, monthlyTransactionCount: monthlyPaid._count._all, monthlyPaidAmount: monthlyPaid._sum.amount ?? 0 },
    workspaces: rows,
    pagination: { page, pageSize, total: hasAggregateFilter ? filteredRows.length : await prisma.workspace.count({ where }) },
  });
}

export async function updateWorkspaceStatusAction(data: unknown) {
  try {
    const actor = await requireSuperAdmin();
    const parsed = workspaceStatusSchema.safeParse(data);
    if (!parsed.success) return errorResult("ข้อมูล workspace ไม่ถูกต้อง", parsed.error.flatten().fieldErrors);

    const workspace = await prisma.workspace.update({
      where: { id: parsed.data.workspaceId },
      data: { status: parsed.data.status },
      select: { id: true, name: true, status: true },
    });

    await prisma.activityLog.create({
      data: {
        workspaceId: workspace.id,
        userId: actor.id,
        action: "SUPER_ADMIN_UPDATE_WORKSPACE_STATUS",
        detail: `เปลี่ยนสถานะ workspace ${workspace.name} เป็น ${workspace.status}`,
      },
    });
    revalidatePath("/admin");
    return successResult(workspace, "อัปเดตสถานะ workspace แล้ว");
  } catch (error) {
    return errorResult(error instanceof Error ? error.message : "ไม่สามารถอัปเดต workspace ได้");
  }
}

export async function regenerateWorkspaceMemberCardTokenAction(data: unknown) {
  try {
    const actor = await requireSuperAdmin();
    const parsed = workspaceIdSchema.safeParse(data);
    if (!parsed.success) return errorResult("ข้อมูล workspace ไม่ถูกต้อง", parsed.error.flatten().fieldErrors);

    const workspace = await prisma.workspace.update({
      where: { id: parsed.data.workspaceId },
      data: { memberCardToken: crypto.randomUUID() },
      select: { id: true, name: true, memberCardToken: true },
    });

    await prisma.activityLog.create({
      data: {
        workspaceId: workspace.id,
        userId: actor.id,
        action: "SUPER_ADMIN_REGENERATE_MEMBER_CARD_TOKEN",
        detail: `รีเซ็ต member-card token ของ ${workspace.name}`,
      },
    });
    revalidatePath("/admin");
    revalidatePath("/workspaces/manage");
    return successResult(workspace, "รีเซ็ตลิงก์ member card แล้ว");
  } catch (error) {
    return errorResult(error instanceof Error ? error.message : "ไม่สามารถรีเซ็ต token ได้");
  }
}

export async function updatePlatformUserStatusAction(data: unknown) {
  try {
    const actor = await requireSuperAdmin();
    const parsed = userStatusSchema.safeParse(data);
    if (!parsed.success) return errorResult("ข้อมูลผู้ใช้ไม่ถูกต้อง", parsed.error.flatten().fieldErrors);
    if (parsed.data.userId === actor.id && parsed.data.status === "INACTIVE") return errorResult("ไม่สามารถปิดใช้งานบัญชี super admin ของตัวเองได้");

    const user = await prisma.user.update({
      where: { id: parsed.data.userId },
      data: { status: parsed.data.status },
      select: { id: true, username: true, fullName: true, status: true },
    });

    await prisma.activityLog.create({
      data: {
        userId: actor.id,
        action: "SUPER_ADMIN_UPDATE_USER_STATUS",
        detail: `เปลี่ยนสถานะผู้ใช้ ${user.fullName} (${user.username}) เป็น ${user.status}`,
      },
    });
    revalidatePath("/admin");
    return successResult(user, "อัปเดตสถานะผู้ใช้แล้ว");
  } catch (error) {
    return errorResult(error instanceof Error ? error.message : "ไม่สามารถอัปเดตผู้ใช้ได้");
  }
}

export async function updatePlatformUserRoleAction(data: unknown) {
  try {
    const actor = await requireSuperAdmin();
    const parsed = userRoleSchema.safeParse(data);
    if (!parsed.success) return errorResult("ข้อมูลสิทธิ์ผู้ใช้ไม่ถูกต้อง", parsed.error.flatten().fieldErrors);

    if (parsed.data.userId === actor.id && parsed.data.role !== "SUPER_ADMIN") {
      return errorResult("ไม่สามารถถอนสิทธิ์ super admin ของตัวเองได้");
    }

    if (parsed.data.role === "USER") {
      const superAdminCount = await prisma.user.count({ where: { role: "SUPER_ADMIN", status: "ACTIVE" } });
      const target = await prisma.user.findUnique({ where: { id: parsed.data.userId }, select: { role: true, status: true } });
      if (target?.role === "SUPER_ADMIN" && target.status === "ACTIVE" && superAdminCount <= 1) {
        return errorResult("ต้องเหลือ SUPER_ADMIN ที่ใช้งานได้อย่างน้อย 1 คน");
      }
    }

    const user = await prisma.user.update({
      where: { id: parsed.data.userId },
      data: { role: parsed.data.role },
      select: { id: true, username: true, fullName: true, role: true },
    });

    await prisma.activityLog.create({
      data: {
        userId: actor.id,
        action: "SUPER_ADMIN_UPDATE_USER_ROLE",
        detail: `เปลี่ยนสิทธิ์ผู้ใช้ ${user.fullName} (${user.username}) เป็น ${user.role}`,
      },
    });
    revalidatePath("/admin");
    return successResult(user, "อัปเดตสิทธิ์ผู้ใช้แล้ว");
  } catch (error) {
    return errorResult(error instanceof Error ? error.message : "ไม่สามารถอัปเดตสิทธิ์ผู้ใช้ได้");
  }
}

export async function resetPlatformUserPasswordAction(data: unknown) {
  try {
    const actor = await requireSuperAdmin();
    const parsed = resetPasswordSchema.safeParse(data);
    if (!parsed.success) return errorResult("ข้อมูลผู้ใช้ไม่ถูกต้อง", parsed.error.flatten().fieldErrors);

    const temporaryPassword = `SS-${crypto.randomUUID().slice(0, 8)}-${Math.floor(1000 + Math.random() * 9000)}`;
    const user = await prisma.user.update({
      where: { id: parsed.data.userId },
      data: { passwordHash: await hashPassword(temporaryPassword) },
      select: { id: true, username: true, fullName: true },
    });

    await prisma.$transaction(async (tx) => {
      await tx.notification.create({
        data: {
          userId: user.id,
          type: "SYSTEM",
          title: "รหัสผ่านของคุณถูกรีเซ็ต",
          message: "กรุณาติดต่อผู้ดูแลระบบเพื่อรับรหัสผ่านชั่วคราว และเปลี่ยนรหัสผ่านหลังเข้าสู่ระบบ",
          linkUrl: "/settings",
        },
      });
      await tx.activityLog.create({
        data: {
          userId: actor.id,
          action: "SUPER_ADMIN_RESET_USER_PASSWORD",
          detail: `รีเซ็ตรหัสผ่านของ ${user.fullName} (${user.username})`,
        },
      });
    });

    revalidatePath("/admin/users");
    return successResult({ temporaryPassword }, `รหัสผ่านชั่วคราว: ${temporaryPassword}`);
  } catch (error) {
    return errorResult(error instanceof Error ? error.message : "ไม่สามารถรีเซ็ตรหัสผ่านได้");
  }
}

export async function sendPlatformAnnouncementAction(data: unknown) {
  try {
    const actor = await requireSuperAdmin();
    const parsed = announcementSchema.safeParse(data);
    if (!parsed.success) return errorResult("ข้อมูลประกาศไม่ถูกต้อง", parsed.error.flatten().fieldErrors);
    const { recipients: uniqueRecipients, workspaceId } = await resolveAnnouncementRecipients(parsed.data);

    await prisma.$transaction(async (tx) => {
      await tx.notification.createMany({
        data: uniqueRecipients.map((recipient) => ({
          userId: recipient.id,
          workspaceId,
          type: "SYSTEM" as const,
          title: parsed.data.title,
          message: parsed.data.message,
          linkUrl: "/dashboard",
        })),
      });
      await tx.activityLog.create({
        data: {
          workspaceId,
          userId: actor.id,
          action: "SUPER_ADMIN_SEND_ANNOUNCEMENT",
          detail: `ส่งประกาศ "${parsed.data.title}" ถึง ${uniqueRecipients.length} คน`,
        },
      });
    });

    revalidatePath("/admin");
    return successResult({ count: uniqueRecipients.length }, `ส่งประกาศแล้ว ${uniqueRecipients.length.toLocaleString("th-TH")} คน`);
  } catch (error) {
    return errorResult(error instanceof Error ? error.message : "ไม่สามารถส่งประกาศได้");
  }
}

export async function createAnnouncementTemplateAction(data: unknown) {
  try {
    const actor = await requireSuperAdmin();
    const parsed = announcementTemplateSchema.safeParse(data);
    if (!parsed.success) return errorResult("ข้อมูล template ไม่ถูกต้อง", parsed.error.flatten().fieldErrors);
    const template = await prisma.announcementTemplate.create({ data: { ...parsed.data, createdById: actor.id } });
    await prisma.activityLog.create({ data: { userId: actor.id, action: "SUPER_ADMIN_CREATE_ANNOUNCEMENT_TEMPLATE", detail: `สร้าง template ${template.name}` } });
    revalidatePath("/admin/announcements");
    return successResult(template, "บันทึก template แล้ว");
  } catch (error) {
    return errorResult(error instanceof Error ? error.message : "ไม่สามารถบันทึก template ได้");
  }
}

export async function createRecipientGroupAction(data: unknown) {
  try {
    const actor = await requireSuperAdmin();
    const parsed = recipientGroupSchema.safeParse(data);
    if (!parsed.success) return errorResult("ข้อมูลกลุ่มผู้รับไม่ถูกต้อง", parsed.error.flatten().fieldErrors);
    const userIds = Array.from(new Set(parsed.data.userIds));
    const activeUsers = await prisma.user.findMany({ where: { id: { in: userIds }, status: "ACTIVE" }, select: { id: true } });
    if (!activeUsers.length) return errorResult("ไม่พบผู้รับที่ใช้งานได้");
    const group = await prisma.recipientGroup.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description,
        createdById: actor.id,
        members: { createMany: { data: activeUsers.map((user) => ({ userId: user.id })) } },
      },
    });
    await prisma.activityLog.create({ data: { userId: actor.id, action: "SUPER_ADMIN_CREATE_RECIPIENT_GROUP", detail: `สร้างกลุ่ม ${group.name} (${activeUsers.length} คน)` } });
    revalidatePath("/admin/announcements");
    return successResult(group, "บันทึกกลุ่มผู้รับแล้ว");
  } catch (error) {
    return errorResult(error instanceof Error ? error.message : "ไม่สามารถบันทึกกลุ่มผู้รับได้");
  }
}

export async function schedulePlatformAnnouncementAction(data: unknown) {
  try {
    const actor = await requireSuperAdmin();
    const parsed = scheduledAnnouncementSchema.safeParse(data);
    if (!parsed.success) return errorResult("ข้อมูลนัดส่งไม่ถูกต้อง", parsed.error.flatten().fieldErrors);
    const scheduledAt = new Date(parsed.data.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) return errorResult("กรุณาเลือกเวลานัดส่งในอนาคต");
    const recipientPreview = await resolveAnnouncementRecipients(parsed.data);
    const scheduled = await prisma.scheduledAnnouncement.create({
      data: {
        target: parsed.data.groupId ? "GROUP" : parsed.data.target,
        workspaceId: recipientPreview.workspaceId,
        userIds: recipientPreview.recipients.map((recipient) => recipient.id),
        title: parsed.data.title,
        message: parsed.data.message,
        scheduledAt,
        createdById: actor.id,
      },
    });
    await prisma.activityLog.create({ data: { workspaceId: recipientPreview.workspaceId, userId: actor.id, action: "SUPER_ADMIN_SCHEDULE_ANNOUNCEMENT", detail: `นัดส่ง "${scheduled.title}" ถึง ${recipientPreview.recipients.length} คน` } });
    revalidatePath("/admin/announcements");
    return successResult(scheduled, "นัดส่งประกาศแล้ว");
  } catch (error) {
    return errorResult(error instanceof Error ? error.message : "ไม่สามารถนัดส่งประกาศได้");
  }
}

export async function cancelScheduledAnnouncementAction(data: unknown) {
  try {
    const actor = await requireSuperAdmin();
    const parsed = idSchema.safeParse(data);
    if (!parsed.success) return errorResult("ข้อมูลนัดส่งไม่ถูกต้อง", parsed.error.flatten().fieldErrors);
    const scheduled = await prisma.scheduledAnnouncement.update({
      where: { id: parsed.data.id },
      data: { status: "CANCELLED" },
      select: { id: true, title: true, workspaceId: true },
    });
    await prisma.activityLog.create({ data: { workspaceId: scheduled.workspaceId, userId: actor.id, action: "SUPER_ADMIN_CANCEL_SCHEDULED_ANNOUNCEMENT", detail: `ยกเลิกนัดส่ง "${scheduled.title}"` } });
    revalidatePath("/admin/announcements");
    return successResult(scheduled, "ยกเลิกนัดส่งแล้ว");
  } catch (error) {
    return errorResult(error instanceof Error ? error.message : "ไม่สามารถยกเลิกนัดส่งได้");
  }
}

export async function sendDueScheduledAnnouncementsAction() {
  try {
    const actor = await requireSuperAdmin();
    const result = await processDueScheduledAnnouncements({ actorUserId: actor.id });
    revalidatePath("/admin/announcements");
    return successResult(result, `ส่ง scheduled broadcast แล้ว ${result.sentCount} รายการ`);
  } catch (error) {
    return errorResult(error instanceof Error ? error.message : "ไม่สามารถส่ง scheduled broadcast ได้");
  }
}

export async function startSupportSessionAction(data: unknown) {
  try {
    const actor = await requireSuperAdmin();
    const parsed = supportSessionSchema.safeParse(data);
    if (!parsed.success) return errorResult("ข้อมูล support session ไม่ถูกต้อง", parsed.error.flatten().fieldErrors);

    const session = await prisma.$transaction(async (tx) => {
      const created = await tx.superAdminSupportSession.create({
        data: {
          workspaceId: parsed.data.workspaceId,
          actorUserId: actor.id,
          mode: parsed.data.mode,
          reason: parsed.data.reason,
          expiresAt: new Date(Date.now() + parsed.data.durationMinutes * 60_000),
        },
        include: { workspace: { select: { name: true } } },
      });
      await tx.activityLog.create({
        data: {
          workspaceId: parsed.data.workspaceId,
          userId: actor.id,
          action: "SUPER_ADMIN_START_SUPPORT_SESSION",
          detail: `เริ่ม support session แบบ ${parsed.data.mode}: ${parsed.data.reason}`,
        },
      });
      return created;
    });

    revalidatePath("/admin/support");
    return successResult(session, `เริ่ม support session สำหรับ ${session.workspace.name} แล้ว`);
  } catch (error) {
    return errorResult(error instanceof Error ? error.message : "ไม่สามารถเริ่ม support session ได้");
  }
}

export async function enterSupportSessionAction(data: unknown) {
  try {
    const actor = await requireSuperAdmin();
    const parsed = endSupportSessionSchema.safeParse(data);
    if (!parsed.success) return errorResult("ข้อมูล support session ไม่ถูกต้อง", parsed.error.flatten().fieldErrors);

    const session = await prisma.superAdminSupportSession.findFirst({
      where: {
        id: parsed.data.sessionId,
        actorUserId: actor.id,
        status: "ACTIVE",
        expiresAt: { gt: new Date() },
      },
      include: { workspace: { select: { id: true, name: true } } },
    });
    if (!session) return errorResult("ไม่พบ support session ที่ใช้งานได้ หรือ session หมดอายุแล้ว");

    await setSupportSessionId(session.id);
    await setCurrentWorkspace(session.workspaceId);
    await prisma.activityLog.create({
      data: {
        workspaceId: session.workspaceId,
        userId: actor.id,
        action: "SUPER_ADMIN_ENTER_SUPPORT_MODE",
        detail: `เข้า support mode แบบ ${session.mode} สำหรับ ${session.workspace.name}`,
      },
    });
    revalidatePath("/");
    return successResult({ workspaceId: session.workspaceId, mode: session.mode }, `เข้าโหมด support ของ ${session.workspace.name} แล้ว`);
  } catch (error) {
    return errorResult(error instanceof Error ? error.message : "ไม่สามารถเข้า support mode ได้");
  }
}

export async function exitSupportSessionAction() {
  try {
    const actor = await requireSuperAdmin();
    const supportSessionId = await getSupportSessionId();
    if (supportSessionId) {
      const session = await prisma.superAdminSupportSession.findFirst({
        where: { id: supportSessionId, actorUserId: actor.id },
        select: { workspaceId: true, workspace: { select: { name: true } } },
      });
      if (session) {
        await prisma.activityLog.create({
          data: {
            workspaceId: session.workspaceId,
            userId: actor.id,
            action: "SUPER_ADMIN_EXIT_SUPPORT_MODE",
            detail: `ออกจาก support mode ของ ${session.workspace.name}`,
          },
        });
      }
    }

    await clearSupportSessionId();
    const nextWorkspace = await prisma.workspaceMember.findFirst({
      where: { userId: actor.id, status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
      select: { workspaceId: true },
    });
    await setCurrentWorkspace(nextWorkspace?.workspaceId ?? null);
    revalidatePath("/");
    return successResult({ workspaceId: nextWorkspace?.workspaceId ?? null }, "ออกจาก support mode แล้ว");
  } catch (error) {
    return errorResult(error instanceof Error ? error.message : "ไม่สามารถออกจาก support mode ได้");
  }
}

export async function endSupportSessionAction(data: unknown) {
  try {
    const actor = await requireSuperAdmin();
    const parsed = endSupportSessionSchema.safeParse(data);
    if (!parsed.success) return errorResult("ข้อมูล support session ไม่ถูกต้อง", parsed.error.flatten().fieldErrors);

    const session = await prisma.$transaction(async (tx) => {
      const updated = await tx.superAdminSupportSession.update({
        where: { id: parsed.data.sessionId },
        data: { status: "ENDED", endedAt: new Date() },
        include: { workspace: { select: { id: true, name: true } } },
      });
      await tx.activityLog.create({
        data: {
          workspaceId: updated.workspace.id,
          userId: actor.id,
          action: "SUPER_ADMIN_END_SUPPORT_SESSION",
          detail: `จบ support session ของ ${updated.workspace.name}`,
        },
      });
      return updated;
    });

    revalidatePath("/admin/support");
    const currentSupportSessionId = await getSupportSessionId();
    if (currentSupportSessionId === session.id) {
      await clearSupportSessionId();
      const nextWorkspace = await prisma.workspaceMember.findFirst({
        where: { userId: actor.id, status: "ACTIVE" },
        orderBy: { createdAt: "asc" },
        select: { workspaceId: true },
      });
      await setCurrentWorkspace(nextWorkspace?.workspaceId ?? null);
    }
    return successResult(session, "จบ support session แล้ว");
  } catch (error) {
    return errorResult(error instanceof Error ? error.message : "ไม่สามารถจบ support session ได้");
  }
}

export async function updatePlatformSettingAction(data: unknown) {
  try {
    const actor = await requireSuperAdmin();
    const parsed = platformSettingSchema.safeParse(data);
    if (!parsed.success) return errorResult("ข้อมูล setting ไม่ถูกต้อง", parsed.error.flatten().fieldErrors);
    const allowed = new Set<string>(DEFAULT_PLATFORM_SETTINGS.map((setting) => setting.key));
    if (!allowed.has(parsed.data.key)) return errorResult("ไม่อนุญาตให้แก้ setting นี้");
    const validationError = validatePlatformSettingValue(parsed.data.key, parsed.data.value);
    if (validationError) return errorResult(validationError);

    const defaultSetting = DEFAULT_PLATFORM_SETTINGS.find((setting) => setting.key === parsed.data.key);
    const setting = await prisma.platformSetting.upsert({
      where: { key: parsed.data.key },
      update: { value: parsed.data.value, updatedBy: actor.id },
      create: { key: parsed.data.key, value: parsed.data.value, label: defaultSetting?.label, updatedBy: actor.id },
    });
    await prisma.activityLog.create({
      data: {
        userId: actor.id,
        action: "SUPER_ADMIN_UPDATE_PLATFORM_SETTING",
        detail: `อัปเดต setting ${setting.key} = ${setting.value}`,
      },
    });
    revalidatePath("/admin/settings");
    return successResult(setting, "บันทึก setting แล้ว");
  } catch (error) {
    return errorResult(error instanceof Error ? error.message : "ไม่สามารถบันทึก setting ได้");
  }
}
