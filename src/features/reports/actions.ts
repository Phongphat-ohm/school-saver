"use server";

import { prisma } from "@/lib/prisma";
import { errorResult, successResult } from "@/lib/result";
import { addCalendarDays, endOfDay, startOfDay, toDateKey } from "@/lib/date";
import { getCurrentWorkspaceOrThrow } from "@/lib/workspace";

function getDateRange(startDate: Date, endDate: Date) {
  const dates: string[] = [];
  const cursor = startOfDay(startDate);
  const end = startOfDay(endDate);
  while (cursor <= end) {
    dates.push(toDateKey(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

type ReportDashboardFilters = {
  from?: string;
  to?: string;
  q?: string;
  roundId?: string;
  paymentMethodId?: string;
  collectedById?: string;
  minAmount?: string;
  maxAmount?: string;
  page?: string;
  pageSize?: string;
  startDate?: Date;
  endDate?: Date;
};

export async function getReportDashboardAction(filters: ReportDashboardFilters = {}) {
  try {
    const { workspaceId, role } = await getCurrentWorkspaceOrThrow();
    const parsedStartDate = filters.startDate instanceof Date ? filters.startDate : undefined;
    const parsedEndDate = filters.endDate instanceof Date ? filters.endDate : undefined;
    const rangeEnd = endOfDay(parsedEndDate ?? new Date());
    const rangeStart = startOfDay(parsedStartDate ?? addCalendarDays(rangeEnd, -29));
    const page = Math.max(1, Math.floor(Number(filters.page ?? 1) || 1));
    const pageSize = Math.min(100, Math.max(10, Math.floor(Number(filters.pageSize ?? 25) || 25)));
    const skip = (page - 1) * pageSize;
    const minAmount = filters.minAmount ? Number(filters.minAmount) : undefined;
    const maxAmount = filters.maxAmount ? Number(filters.maxAmount) : undefined;
    const q = filters.q?.trim();
    const where = {
      workspaceId,
      paidAt: { gte: rangeStart, lte: rangeEnd },
      ...(filters.roundId ? { roundId: filters.roundId } : {}),
      ...(filters.paymentMethodId ? { paymentMethodId: filters.paymentMethodId } : {}),
      ...(filters.collectedById ? { collectedById: filters.collectedById } : {}),
      ...(Number.isFinite(minAmount) || Number.isFinite(maxAmount)
        ? { amount: { ...(Number.isFinite(minAmount) ? { gte: minAmount } : {}), ...(Number.isFinite(maxAmount) ? { lte: maxAmount } : {}) } }
        : {}),
      ...(q
        ? {
            OR: [
              { note: { contains: q, mode: "insensitive" as const } },
              { member: { fullName: { contains: q, mode: "insensitive" as const } } },
              { member: { memberCode: { contains: q, mode: "insensitive" as const } } },
              { member: { studentNo: { contains: q, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    };

    const [totals, transactionCount, transactions, outstandingTotals, activeRoundCount, methodGroups, roundGroups, collectorGroups, rounds, paymentMethods, collectors] = await Promise.all([
      prisma.paymentTransaction.aggregate({
        where,
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.paymentTransaction.count({ where }),
      prisma.paymentTransaction.findMany({
        where,
        select: {
          id: true,
          amount: true,
          paidAt: true,
          note: true,
          member: { select: { id: true, fullName: true, memberCode: true, studentNo: true, classroom: true } },
          round: { select: { id: true, title: true } },
          paymentMethod: { select: { id: true, name: true, type: true } },
          collectedBy: { select: { id: true, fullName: true, username: true } },
        },
        orderBy: { paidAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.memberRound.aggregate({
        where: { workspaceId, remainingAmount: { gt: 0 }, round: { status: "OPEN" } },
        _sum: { remainingAmount: true },
        _count: { _all: true },
      }),
      prisma.collectionRound.count({ where: { workspaceId, status: "OPEN" } }),
      prisma.paymentTransaction.groupBy({
        by: ["paymentMethodId"],
        where,
        _sum: { amount: true },
        _count: { _all: true },
        orderBy: { _sum: { amount: "desc" } },
      }),
      prisma.paymentTransaction.groupBy({
        by: ["roundId"],
        where,
        _sum: { amount: true },
        _count: { _all: true },
        orderBy: { _sum: { amount: "desc" } },
        take: 8,
      }),
      prisma.paymentTransaction.groupBy({
        by: ["collectedById"],
        where,
        _sum: { amount: true },
        _count: { _all: true },
        orderBy: { _sum: { amount: "desc" } },
      }),
      prisma.collectionRound.findMany({ where: { workspaceId }, select: { id: true, title: true }, orderBy: { createdAt: "desc" }, take: 300 }),
      prisma.paymentMethod.findMany({ where: { workspaceId }, select: { id: true, name: true, type: true }, orderBy: { name: "asc" }, take: 100 }),
      prisma.user.findMany({
        where: { collectedTransactions: { some: { workspaceId } } },
        select: { id: true, fullName: true, username: true },
        orderBy: { fullName: "asc" },
        take: 200,
      }),
    ]);

    const chartRangeStart = rangeStart > addCalendarDays(rangeEnd, -89) ? rangeStart : startOfDay(addCalendarDays(rangeEnd, -89));
    const dailyMap = new Map<string, { label: string; amount: number; count: number }>();
    for (const dateKey of getDateRange(chartRangeStart, rangeEnd)) dailyMap.set(dateKey, { label: dateKey, amount: 0, count: 0 });
    await Promise.all(
      Array.from(dailyMap.keys()).map(async (dateKey) => {
        const dayStart = startOfDay(new Date(dateKey));
        const dayEnd = endOfDay(new Date(dateKey));
        const dayTotals = await prisma.paymentTransaction.aggregate({
          where: { ...where, paidAt: { gte: dayStart, lte: dayEnd } },
          _sum: { amount: true },
          _count: { _all: true },
        });
        dailyMap.set(dateKey, { label: dateKey, amount: dayTotals._sum.amount ?? 0, count: dayTotals._count._all });
      }),
    );

    const sortByAmount = (a: { amount: number }, b: { amount: number }) => b.amount - a.amount;
    const methodNames = new Map(paymentMethods.map((method) => [method.id, method.name]));
    const roundNames = new Map(rounds.map((round) => [round.id, round.title]));
    const collectorNames = new Map(collectors.map((collector) => [collector.id, collector.fullName || collector.username]));

    return successResult({
      startDate: rangeStart,
      endDate: rangeEnd,
      totalAmount: totals._sum.amount ?? 0,
      transactionCount: transactionCount,
      averageTransactionAmount: transactionCount ? Math.round((totals._sum.amount ?? 0) / transactionCount) : 0,
      outstandingAmount: outstandingTotals._sum.remainingAmount ?? 0,
      outstandingCount: outstandingTotals._count._all,
      activeRoundCount,
      dailySeries: Array.from(dailyMap.values()),
      paymentMethodSeries: methodGroups.map((row) => ({ label: methodNames.get(row.paymentMethodId) ?? "Unknown", amount: row._sum.amount ?? 0, count: row._count._all })).sort(sortByAmount),
      roundSeries: roundGroups.map((row) => ({ label: roundNames.get(row.roundId) ?? "Unknown", amount: row._sum.amount ?? 0, count: row._count._all })).sort(sortByAmount),
      collectorSeries: collectorGroups.map((row) => ({ label: collectorNames.get(row.collectedById) ?? "Unknown", amount: row._sum.amount ?? 0, count: row._count._all })).sort(sortByAmount),
      transactions,
      pagination: { page, pageSize, total: transactionCount, totalPages: Math.max(1, Math.ceil(transactionCount / pageSize)) },
      filters: {
        from: filters.from ?? "",
        to: filters.to ?? "",
        q: filters.q ?? "",
        roundId: filters.roundId ?? "",
        paymentMethodId: filters.paymentMethodId ?? "",
        collectedById: filters.collectedById ?? "",
        minAmount: filters.minAmount ?? "",
        maxAmount: filters.maxAmount ?? "",
        pageSize: String(pageSize),
      },
      filterOptions: { rounds, paymentMethods, collectors },
      canCancelPayments: role === "OWNER" || role === "ADMIN" || role === "COLLECTOR",
    });
  } catch {
    return errorResult("ไม่สามารถดึงรายงานได้");
  }
}

export async function getDailyReportAction(date: Date) {
  try {
    const { workspaceId } = await getCurrentWorkspaceOrThrow();
    const where = { workspaceId, paidAt: { gte: startOfDay(date), lte: endOfDay(date) } };
    const [totals, transactions] = await Promise.all([
      prisma.paymentTransaction.aggregate({
        where,
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.paymentTransaction.findMany({
        where,
        select: {
          id: true,
          amount: true,
          paidAt: true,
          note: true,
          member: { select: { id: true, fullName: true, memberCode: true, studentNo: true } },
          round: { select: { id: true, title: true } },
          paymentMethod: { select: { id: true, name: true, type: true } },
          collectedBy: { select: { id: true, fullName: true, username: true } },
        },
        orderBy: { paidAt: "desc" },
      }),
    ]);

    return successResult({
      totalAmount: totals._sum.amount ?? 0,
      transactionCount: totals._count._all,
      byPaymentMethod: Object.groupBy(transactions, (row) => row.paymentMethod.name),
      byCollector: Object.groupBy(transactions, (row) => row.collectedBy.fullName),
      transactions,
    });
  } catch {
    return errorResult("ไม่สามารถดึงรายงานรายวันได้");
  }
}

export async function getRoundReportAction(roundId: string) {
  try {
    const { workspaceId } = await getCurrentWorkspaceOrThrow();
    const [round, totals, statusCounts, outstandingMembers] = await Promise.all([
      prisma.collectionRound.findFirst({
        where: { id: roundId, workspaceId },
        select: { id: true, title: true, description: true, targetAmount: true, startDate: true, dueDate: true, status: true },
      }),
      prisma.memberRound.aggregate({
        where: { workspaceId, roundId },
        _sum: { targetAmount: true, paidAmount: true, fineAmount: true, remainingAmount: true },
        _count: { _all: true },
      }),
      prisma.memberRound.groupBy({
        by: ["status"],
        where: { workspaceId, roundId },
        _count: { _all: true },
      }),
      prisma.memberRound.findMany({
        where: { workspaceId, roundId, remainingAmount: { gt: 0 } },
        select: {
          id: true,
          targetAmount: true,
          paidAmount: true,
          remainingAmount: true,
          fineAmount: true,
          status: true,
          member: { select: { id: true, fullName: true, memberCode: true, studentNo: true } },
        },
        orderBy: { remainingAmount: "desc" },
      }),
    ]);

    if (!round) return errorResult("ไม่พบรอบใน workspace นี้");
    const counts = Object.fromEntries(statusCounts.map((row) => [row.status, row._count._all]));

    return successResult({
      round,
      totalMembers: totals._count._all,
      paid: (counts.PAID ?? 0) + (counts.LATE_PAID ?? 0),
      partial: (counts.PARTIAL ?? 0) + (counts.PARTIAL_OVERDUE ?? 0),
      unpaid: counts.UNPAID ?? 0,
      overdue: (counts.OVERDUE ?? 0) + (counts.PARTIAL_OVERDUE ?? 0),
      totalTargetAmount: totals._sum.targetAmount ?? 0,
      totalPaidAmount: totals._sum.paidAmount ?? 0,
      totalFineAmount: totals._sum.fineAmount ?? 0,
      totalOutstandingAmount: totals._sum.remainingAmount ?? 0,
      outstandingMembers,
    });
  } catch {
    return errorResult("ไม่สามารถดึงรายงานตามรอบได้");
  }
}

export async function getMemberReportAction(memberId: string) {
  try {
    const { workspaceId } = await getCurrentWorkspaceOrThrow();
    const [member, paidTotals, outstandingTotals, memberRounds, paymentTransactions] = await Promise.all([
      prisma.member.findFirst({
        where: { id: memberId, workspaceId },
        select: { id: true, memberCode: true, studentNo: true, fullName: true, classroom: true, phone: true, status: true },
      }),
      prisma.paymentTransaction.aggregate({ where: { workspaceId, memberId }, _sum: { amount: true } }),
      prisma.memberRound.aggregate({
        where: { workspaceId, memberId, round: { status: { not: "CANCELLED" } } },
        _sum: { remainingAmount: true },
      }),
      prisma.memberRound.findMany({
        where: { workspaceId, memberId },
        select: {
          id: true,
          targetAmount: true,
          paidAmount: true,
          remainingAmount: true,
          fineAmount: true,
          status: true,
          round: { select: { id: true, title: true, status: true, dueDate: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.paymentTransaction.findMany({
        where: { workspaceId, memberId },
        select: {
          id: true,
          amount: true,
          paidAt: true,
          round: { select: { id: true, title: true } },
          paymentMethod: { select: { id: true, name: true, type: true } },
        },
        orderBy: { paidAt: "desc" },
      }),
    ]);

    if (!member) return errorResult("ไม่พบสมาชิกใน workspace นี้");
    return successResult({
      member: { ...member, memberRounds, paymentTransactions },
      totalPaidAmount: paidTotals._sum.amount ?? 0,
      totalOutstandingAmount: outstandingTotals._sum.remainingAmount ?? 0,
    });
  } catch {
    return errorResult("ไม่สามารถดึงรายงานสมาชิกได้");
  }
}
