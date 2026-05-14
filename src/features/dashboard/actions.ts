"use server";

import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay } from "@/lib/date";
import { errorResult, successResult } from "@/lib/result";
import { getCurrentWorkspaceOrThrow } from "@/lib/workspace";

export async function getDashboardSummaryAction() {
  try {
    const { workspaceId } = await getCurrentWorkspaceOrThrow();
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());
    const [
      totalMembers,
      activeRounds,
      memberRoundTotals,
      memberRoundStatuses,
      todayTotals,
      recentTransactions,
      openRounds,
      topOutstandingMembers,
    ] = await Promise.all([
      prisma.member.count({ where: { workspaceId, status: "ACTIVE" } }),
      prisma.collectionRound.count({ where: { workspaceId, status: "OPEN" } }),
      prisma.memberRound.aggregate({
        where: { workspaceId, round: { status: "OPEN" } },
        _sum: {
          targetAmount: true,
          paidAmount: true,
          fineAmount: true,
          remainingAmount: true,
        },
      }),
      prisma.memberRound.groupBy({
        by: ["status"],
        where: { workspaceId, round: { status: "OPEN" } },
        _count: { _all: true },
      }),
      prisma.paymentTransaction.aggregate({
        where: { workspaceId, paidAt: { gte: todayStart, lte: todayEnd } },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.paymentTransaction.findMany({
        where: { workspaceId },
        select: {
          id: true,
          amount: true,
          paidAt: true,
          member: { select: { id: true, fullName: true } },
          round: { select: { id: true, title: true } },
          paymentMethod: { select: { id: true, name: true, type: true } },
        },
        orderBy: { paidAt: "desc" },
        take: 8,
      }),
      prisma.collectionRound.findMany({
        where: { workspaceId, status: "OPEN" },
        select: { id: true, title: true, dueDate: true },
        take: 5,
        orderBy: { createdAt: "desc" },
      }),
      prisma.memberRound.findMany({
        where: { workspaceId, remainingAmount: { gt: 0 }, round: { status: "OPEN" } },
        select: {
          id: true,
          remainingAmount: true,
          member: { select: { id: true, fullName: true, memberCode: true, studentNo: true } },
          round: { select: { id: true, title: true, dueDate: true } },
        },
        orderBy: { remainingAmount: "desc" },
        take: 5,
      }),
    ]);

    const statusCounts = Object.fromEntries(memberRoundStatuses.map((row) => [row.status, row._count._all]));

    const summary = {
      totalMembers,
      activeRounds,
      totalTargetAmount: memberRoundTotals._sum.targetAmount ?? 0,
      totalPaidAmount: memberRoundTotals._sum.paidAmount ?? 0,
      totalFineAmount: memberRoundTotals._sum.fineAmount ?? 0,
      totalOutstandingAmount: memberRoundTotals._sum.remainingAmount ?? 0,
      todayPaidAmount: todayTotals._sum.amount ?? 0,
      todayTransactionCount: todayTotals._count._all,
      unpaidCount: statusCounts.UNPAID ?? 0,
      partialCount: (statusCounts.PARTIAL ?? 0) + (statusCounts.PARTIAL_OVERDUE ?? 0),
      paidCount: (statusCounts.PAID ?? 0) + (statusCounts.LATE_PAID ?? 0),
      overdueCount: (statusCounts.OVERDUE ?? 0) + (statusCounts.PARTIAL_OVERDUE ?? 0),
      recentTransactions,
      openRounds,
      topOutstandingMembers,
    };
    return successResult(summary);
  } catch {
    return errorResult("ไม่สามารถดึง dashboard ได้");
  }
}
