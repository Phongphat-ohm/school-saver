"use server";

import { prisma } from "@/lib/prisma";
import { errorResult, successResult } from "@/lib/result";
import { endOfDay, startOfDay } from "@/lib/date";
import { getCurrentWorkspaceOrThrow } from "@/lib/workspace";

export async function getDailyReportAction(date: Date) {
  try {
    const { workspaceId } = await getCurrentWorkspaceOrThrow();
    const transactions = await prisma.paymentTransaction.findMany({
      where: { workspaceId, paidAt: { gte: startOfDay(date), lte: endOfDay(date) } },
      include: { member: true, round: true, paymentMethod: true, collectedBy: true },
      orderBy: { paidAt: "desc" },
    });
    return successResult({
      totalAmount: transactions.reduce((sum, row) => sum + row.amount, 0),
      transactionCount: transactions.length,
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
    const round = await prisma.collectionRound.findFirst({
      where: { id: roundId, workspaceId },
      include: { memberRounds: { include: { member: true } } },
    });
    if (!round) return errorResult("ไม่พบรอบใน workspace นี้");
    const rows = round.memberRounds;
    return successResult({
      round,
      totalMembers: rows.length,
      paid: rows.filter((row) => row.status === "PAID" || row.status === "LATE_PAID").length,
      partial: rows.filter((row) => row.status === "PARTIAL" || row.status === "PARTIAL_OVERDUE").length,
      unpaid: rows.filter((row) => row.status === "UNPAID").length,
      overdue: rows.filter((row) => row.status === "OVERDUE" || row.status === "PARTIAL_OVERDUE").length,
      totalTargetAmount: rows.reduce((sum, row) => sum + row.targetAmount, 0),
      totalPaidAmount: rows.reduce((sum, row) => sum + row.paidAmount, 0),
      totalFineAmount: rows.reduce((sum, row) => sum + row.fineAmount, 0),
      totalOutstandingAmount: rows.reduce((sum, row) => sum + row.remainingAmount, 0),
      outstandingMembers: rows.filter((row) => row.remainingAmount > 0),
    });
  } catch {
    return errorResult("ไม่สามารถดึงรายงานตามรอบได้");
  }
}

export async function getMemberReportAction(memberId: string) {
  try {
    const { workspaceId } = await getCurrentWorkspaceOrThrow();
    const member = await prisma.member.findFirst({
      where: { id: memberId, workspaceId },
      include: {
        memberRounds: { include: { round: true }, orderBy: { createdAt: "desc" } },
        paymentTransactions: { include: { round: true, paymentMethod: true }, orderBy: { paidAt: "desc" } },
      },
    });
    if (!member) return errorResult("ไม่พบสมาชิกใน workspace นี้");
    return successResult({
      member,
      totalPaidAmount: member.paymentTransactions.reduce((sum, row) => sum + row.amount, 0),
      totalOutstandingAmount: member.memberRounds.reduce((sum, row) => sum + (row.round.status === "CANCELLED" ? 0 : row.remainingAmount), 0),
    });
  } catch {
    return errorResult("ไม่สามารถดึงรายงานสมาชิกได้");
  }
}
