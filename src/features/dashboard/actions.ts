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
    const [totalMembers, activeRounds, memberRounds, todayTransactions, recentTransactions, openRounds] = await Promise.all([
      prisma.member.count({ where: { workspaceId, status: "ACTIVE" } }),
      prisma.collectionRound.count({ where: { workspaceId, status: "OPEN" } }),
      prisma.memberRound.findMany({ where: { workspaceId } }),
      prisma.paymentTransaction.findMany({ where: { workspaceId, paidAt: { gte: todayStart, lte: todayEnd } } }),
      prisma.paymentTransaction.findMany({
        where: { workspaceId },
        include: { member: true, round: true, paymentMethod: true },
        orderBy: { paidAt: "desc" },
        take: 8,
      }),
      prisma.collectionRound.findMany({ where: { workspaceId, status: "OPEN" }, take: 5, orderBy: { createdAt: "desc" } }),
    ]);
    const summary = {
      totalMembers,
      activeRounds,
      totalTargetAmount: memberRounds.reduce((sum, row) => sum + row.targetAmount, 0),
      totalPaidAmount: memberRounds.reduce((sum, row) => sum + row.paidAmount, 0),
      totalFineAmount: memberRounds.reduce((sum, row) => sum + row.fineAmount, 0),
      totalOutstandingAmount: memberRounds.reduce((sum, row) => sum + row.remainingAmount, 0),
      todayPaidAmount: todayTransactions.reduce((sum, row) => sum + row.amount, 0),
      todayTransactionCount: todayTransactions.length,
      unpaidCount: memberRounds.filter((row) => row.status === "UNPAID").length,
      partialCount: memberRounds.filter((row) => row.status === "PARTIAL" || row.status === "PARTIAL_OVERDUE").length,
      paidCount: memberRounds.filter((row) => row.status === "PAID" || row.status === "LATE_PAID").length,
      overdueCount: memberRounds.filter((row) => row.status === "OVERDUE" || row.status === "PARTIAL_OVERDUE").length,
      recentTransactions,
      openRounds,
      topOutstandingMembers: await prisma.memberRound.findMany({
        where: { workspaceId, remainingAmount: { gt: 0 } },
        include: { member: true, round: true },
        orderBy: { remainingAmount: "desc" },
        take: 5,
      }),
    };
    return successResult(summary);
  } catch {
    return errorResult("ไม่สามารถดึง dashboard ได้");
  }
}
