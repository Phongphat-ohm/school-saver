"use server";

import { prisma } from "@/lib/prisma";
import { errorResult, successResult } from "@/lib/result";
import { endOfDay, startOfDay } from "@/lib/date";
import { getCurrentWorkspaceOrThrow } from "@/lib/workspace";

function toDateKey(date: Date | string) {
  return new Date(date).toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  return value;
}

function getDateRange(startDate: Date, endDate: Date) {
  const dates: string[] = [];
  const cursor = startOfDay(startDate);
  const end = startOfDay(endDate);
  while (cursor <= end) {
    dates.push(toDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

export async function getReportDashboardAction(startDate?: Date, endDate?: Date) {
  try {
    const { workspaceId, role } = await getCurrentWorkspaceOrThrow();
    const rangeEnd = endOfDay(endDate ?? new Date());
    const rangeStart = startOfDay(startDate ?? addDays(rangeEnd, -29));
    const where = { workspaceId, paidAt: { gte: rangeStart, lte: rangeEnd } };

    const [totals, transactions, outstandingTotals, activeRoundCount] = await Promise.all([
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
          member: { select: { id: true, fullName: true, memberCode: true, studentNo: true, classroom: true } },
          round: { select: { id: true, title: true } },
          paymentMethod: { select: { id: true, name: true, type: true } },
          collectedBy: { select: { id: true, fullName: true, username: true } },
        },
        orderBy: { paidAt: "desc" },
      }),
      prisma.memberRound.aggregate({
        where: { workspaceId, remainingAmount: { gt: 0 }, round: { status: "OPEN" } },
        _sum: { remainingAmount: true },
        _count: { _all: true },
      }),
      prisma.collectionRound.count({ where: { workspaceId, status: "OPEN" } }),
    ]);

    const dailyMap = new Map<string, { label: string; amount: number; count: number }>();
    for (const dateKey of getDateRange(rangeStart, rangeEnd)) dailyMap.set(dateKey, { label: dateKey, amount: 0, count: 0 });

    const methodMap = new Map<string, { label: string; amount: number; count: number }>();
    const roundMap = new Map<string, { label: string; amount: number; count: number }>();
    const collectorMap = new Map<string, { label: string; amount: number; count: number }>();

    for (const transaction of transactions) {
      const dateKey = toDateKey(transaction.paidAt);
      const daily = dailyMap.get(dateKey) ?? { label: dateKey, amount: 0, count: 0 };
      daily.amount += transaction.amount;
      daily.count += 1;
      dailyMap.set(dateKey, daily);

      const method = methodMap.get(transaction.paymentMethod.name) ?? { label: transaction.paymentMethod.name, amount: 0, count: 0 };
      method.amount += transaction.amount;
      method.count += 1;
      methodMap.set(transaction.paymentMethod.name, method);

      const round = roundMap.get(transaction.round.title) ?? { label: transaction.round.title, amount: 0, count: 0 };
      round.amount += transaction.amount;
      round.count += 1;
      roundMap.set(transaction.round.title, round);

      const collectorName = transaction.collectedBy.fullName || transaction.collectedBy.username;
      const collector = collectorMap.get(collectorName) ?? { label: collectorName, amount: 0, count: 0 };
      collector.amount += transaction.amount;
      collector.count += 1;
      collectorMap.set(collectorName, collector);
    }

    const sortByAmount = (a: { amount: number }, b: { amount: number }) => b.amount - a.amount;

    return successResult({
      startDate: rangeStart,
      endDate: rangeEnd,
      totalAmount: totals._sum.amount ?? 0,
      transactionCount: totals._count._all,
      averageTransactionAmount: totals._count._all ? Math.round((totals._sum.amount ?? 0) / totals._count._all) : 0,
      outstandingAmount: outstandingTotals._sum.remainingAmount ?? 0,
      outstandingCount: outstandingTotals._count._all,
      activeRoundCount,
      dailySeries: Array.from(dailyMap.values()),
      paymentMethodSeries: Array.from(methodMap.values()).sort(sortByAmount),
      roundSeries: Array.from(roundMap.values()).sort(sortByAmount).slice(0, 8),
      collectorSeries: Array.from(collectorMap.values()).sort(sortByAmount),
      transactions,
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
