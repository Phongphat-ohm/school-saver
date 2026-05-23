"use server";

import { Prisma } from "@/generated/prisma/client";
import { OWNER_ADMIN, requireWorkspaceRole } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { errorResult, successResult } from "@/lib/result";

const DEFAULT_PAGE_SIZE = 25;
const DEFAULT_MAX_COUNT = 200;
const MAX_PAGE_SIZE = 100;
const MAX_COUNT_LIMIT = 1000;

export type ActivityLogQueryInput = {
  page?: string | number;
  pageSize?: string | number;
  maxCount?: string | number;
  q?: string;
  action?: string;
  outcome?: string;
  ipAddress?: string;
};

export async function getActivityLogsAction(input: ActivityLogQueryInput = {}) {
  try {
    const { workspaceId } = await requireWorkspaceRole(OWNER_ADMIN);
    const filters = normalizeActivityLogFilters(input);
    const baseWhere: Prisma.ActivityLogWhereInput = {
      workspaceId,
    };
    const where: Prisma.ActivityLogWhereInput = {
      AND: [
        baseWhere,
        filters.action ? { action: filters.action } : {},
        filters.outcome ? { outcome: filters.outcome } : {},
        filters.ipAddress ? { ipAddress: { contains: filters.ipAddress } } : {},
        filters.q
          ? {
              OR: [
                { action: { contains: filters.q, mode: "insensitive" } },
                { detail: { contains: filters.q, mode: "insensitive" } },
                { ipAddress: { contains: filters.q } },
                { userAgent: { contains: filters.q, mode: "insensitive" } },
                { user: { is: { username: { contains: filters.q, mode: "insensitive" } } } },
                { user: { is: { fullName: { contains: filters.q, mode: "insensitive" } } } },
              ],
            }
          : {},
      ],
    };

    const total = await prisma.activityLog.count({ where });
    const cappedTotal = Math.min(total, filters.maxCount);
    const pageCount = Math.max(1, Math.ceil(cappedTotal / filters.pageSize));
    const page = Math.min(filters.page, pageCount);
    const skip = (page - 1) * filters.pageSize;
    const take = Math.max(0, Math.min(filters.pageSize, filters.maxCount - skip));

    const [logs, actionRows] = await Promise.all([
      take
        ? prisma.activityLog.findMany({
            where,
            include: {
              user: { select: { id: true, username: true, fullName: true } },
            },
            orderBy: { createdAt: "desc" },
            skip,
            take,
          })
        : [],
      prisma.activityLog.groupBy({
        by: ["action"],
        where: baseWhere,
        orderBy: { action: "asc" },
      }),
    ]);

    return successResult({
      logs,
      filters: { ...filters, page },
      pagination: {
        page,
        pageSize: filters.pageSize,
        maxCount: filters.maxCount,
        total,
        cappedTotal,
        pageCount,
        hasPreviousPage: page > 1,
        hasNextPage: page < pageCount,
      },
      options: {
        actions: actionRows.map((row) => row.action),
        outcomes: ["SUCCESS", "FAILURE", "BLOCKED"],
      },
    });
  } catch (error) {
    return errorResult(error instanceof Error ? error.message : "ไม่สามารถดึง activity log ได้");
  }
}

function normalizeActivityLogFilters(input: ActivityLogQueryInput) {
  return {
    page: clampInteger(input.page, 1, 1, Number.MAX_SAFE_INTEGER),
    pageSize: clampInteger(input.pageSize, DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE),
    maxCount: clampInteger(input.maxCount, DEFAULT_MAX_COUNT, 1, MAX_COUNT_LIMIT),
    q: normalizeText(input.q),
    action: normalizeText(input.action),
    outcome: normalizeText(input.outcome),
    ipAddress: normalizeText(input.ipAddress),
  };
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function clampInteger(value: unknown, fallback: number, min: number, max: number) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}
