"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { writeActivityLog } from "@/lib/activity-log";
import { COLLECT_PAYMENT, requireWorkspaceRole } from "@/lib/permissions";
import { getCurrentWorkspaceOrThrow } from "@/lib/workspace";
import { errorResult, successResult } from "@/lib/result";
import { calculateCurrentMemberRound } from "@/lib/fine";
import { endOfDay, startOfDay } from "@/lib/date";
import { paymentHistoryFilterSchema, paymentSchema, updatePaymentTransactionSchema } from "@/features/payments/schemas";

const unpaidStatuses = ["UNPAID", "PARTIAL", "OVERDUE", "PARTIAL_OVERDUE"] as const;

async function recalculateMemberRoundAfterTransactionChange(tx: typeof prisma, workspaceId: string, memberRoundId: string) {
  const memberRound = await tx.memberRound.findFirst({
    where: { id: memberRoundId, workspaceId },
    include: { round: true },
  });
  if (!memberRound) throw new Error("ไม่พบรายการสมาชิกในรอบนี้");

  const [totals, lastTransaction] = await Promise.all([
    tx.paymentTransaction.aggregate({
      where: { workspaceId, memberRoundId },
      _sum: { amount: true },
    }),
    tx.paymentTransaction.findFirst({
      where: { workspaceId, memberRoundId },
      select: { paidAt: true },
      orderBy: { paidAt: "desc" },
    }),
  ]);

  const paidAmount = totals._sum.amount ?? 0;
  const baseStatus = paidAmount > 0 ? ("PARTIAL" as const) : ("UNPAID" as const);
  const current = calculateCurrentMemberRound({ ...memberRound, paidAmount, fineAmount: 0, status: baseStatus }, memberRound.round, lastTransaction?.paidAt ?? new Date());
  const completed = current.outstandingAmount <= 0;

  return tx.memberRound.update({
    where: { id: memberRoundId },
    data: {
      paidAmount,
      fineAmount: current.currentFine,
      totalRequiredAmount: current.totalRequiredAmount,
      remainingAmount: current.outstandingAmount,
      status: current.currentStatus,
      completedAt: completed ? (lastTransaction?.paidAt ?? new Date()) : null,
    },
  });
}

export async function searchMembersForPaymentAction(keyword = "") {
  try {
    const { workspaceId } = await getCurrentWorkspaceOrThrow();
    const trimmed = keyword.trim();
    const members = await prisma.member.findMany({
      where: {
        workspaceId,
        status: "ACTIVE",
        OR: trimmed
          ? [
              { fullName: { contains: trimmed, mode: "insensitive" } },
              { memberCode: { contains: trimmed, mode: "insensitive" } },
              { studentNo: { contains: trimmed, mode: "insensitive" } },
              { phone: { contains: trimmed, mode: "insensitive" } },
            ]
          : undefined,
      },
      select: {
        id: true,
        workspaceId: true,
        memberCode: true,
        studentNo: true,
        fullName: true,
        classroom: true,
        phone: true,
        status: true,
        memberRounds: {
          where: { workspaceId, status: { in: [...unpaidStatuses] }, round: { status: "OPEN" } },
          select: {
            id: true,
            workspaceId: true,
            roundId: true,
            memberId: true,
            targetAmount: true,
            paidAmount: true,
            remainingAmount: true,
            fineAmount: true,
            totalRequiredAmount: true,
            status: true,
            completedAt: true,
            createdAt: true,
            updatedAt: true,
            round: {
              select: {
                id: true,
                title: true,
                dueDate: true,
                fineEnabled: true,
                fineType: true,
                fineAmount: true,
                fineMaxAmount: true,
                status: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
      take: 30,
    });
    const today = new Date();
    return successResult(
      members
        .map((member) => ({
          ...member,
          memberRounds: member.memberRounds.map((memberRound) => ({
            ...memberRound,
            current: calculateCurrentMemberRound(memberRound, memberRound.round, today),
          })),
        }))
        .filter((member) => member.memberRounds.length > 0),
    );
  } catch {
    return errorResult("ไม่สามารถค้นหาสมาชิกได้");
  }
}

export async function payMemberRoundAction(data: unknown) {
  try {
    const { workspaceId, userId } = await requireWorkspaceRole(COLLECT_PAYMENT);
    const parsed = paymentSchema.safeParse(data);
    if (!parsed.success) return errorResult("ข้อมูลการรับเงินไม่ถูกต้อง", parsed.error.flatten().fieldErrors);

    const result = await prisma.$transaction(async (tx) => {
      const memberRound = await tx.memberRound.findFirst({
        where: { id: parsed.data.memberRoundId, workspaceId },
        include: {
          round: true,
          member: { select: { id: true, fullName: true } },
        },
      });
      if (!memberRound) throw new Error("ไม่พบรายการสมาชิกในรอบนี้");
      if (memberRound.round.status === "CANCELLED") throw new Error("รอบนี้ถูกยกเลิกแล้ว ไม่สามารถรับชำระได้");
      if (["PAID", "LATE_PAID", "WAIVED"].includes(memberRound.status)) throw new Error("รายการนี้ปิดยอดแล้ว");
      const method = await tx.paymentMethod.findFirst({
        where: { id: parsed.data.paymentMethodId, workspaceId, status: "ACTIVE" },
      });
      if (!method) throw new Error("วิธีชำระเงินไม่อยู่ใน workspace นี้");

      const current = calculateCurrentMemberRound(memberRound, memberRound.round, parsed.data.paidAt);
      if (parsed.data.amount > current.outstandingAmount) throw new Error("จำนวนเงินเกินยอดค้างปัจจุบัน");
      const paidAmount = memberRound.paidAmount + parsed.data.amount;
      const remainingAmount = Math.max(current.totalRequiredAmount - paidAmount, 0);
      const completed = remainingAmount <= 0;
      const status = completed
        ? parsed.data.paidAt <= memberRound.round.dueDate
          ? "PAID"
          : "LATE_PAID"
        : parsed.data.paidAt > memberRound.round.dueDate
          ? "PARTIAL_OVERDUE"
          : "PARTIAL";

      const transaction = await tx.paymentTransaction.create({
        data: {
          workspaceId,
          memberRoundId: memberRound.id,
          roundId: memberRound.roundId,
          memberId: memberRound.memberId,
          amount: parsed.data.amount,
          paymentMethodId: parsed.data.paymentMethodId,
          paidAt: parsed.data.paidAt,
          collectedById: userId,
          note: parsed.data.note,
        },
      });
      const updated = await tx.memberRound.update({
        where: { id: memberRound.id },
        data: {
          paidAmount,
          fineAmount: current.currentFine,
          totalRequiredAmount: current.totalRequiredAmount,
          remainingAmount,
          status,
          completedAt: completed ? parsed.data.paidAt : null,
        },
      });
      await writeActivityLog(tx, {
        workspaceId,
        userId,
        action: "COLLECT_PAYMENT",
        detail: `รับเงิน ${memberRound.member.fullName} จำนวน ${parsed.data.amount}`,
      });
      return { transaction, memberRound: updated };
    });
    revalidatePath("/");
    revalidatePath("/payments");
    revalidatePath("/payments/history");
    revalidatePath("/overdue");
    revalidatePath("/rounds");
    revalidatePath(`/rounds/${result.memberRound.roundId}`);
    return successResult(result, "บันทึกรับเงินสำเร็จ");
  } catch (error) {
    return errorResult(error instanceof Error ? error.message : "ไม่สามารถรับเงินได้");
  }
}

export async function cancelPaymentTransactionAction(transactionId: string) {
  try {
    const { workspaceId, userId } = await requireWorkspaceRole(COLLECT_PAYMENT);

    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.paymentTransaction.findFirst({
        where: { id: transactionId, workspaceId },
        include: {
          member: { select: { fullName: true } },
          memberRound: {
            include: {
              round: true,
            },
          },
        },
      });

      if (!transaction) throw new Error("ไม่พบรายการรับเงินในพื้นที่ทำงานนี้");
      if (transaction.memberRound.round.status === "CANCELLED") {
        throw new Error("รอบชำระเงินนี้ถูกยกเลิกแล้ว ไม่สามารถยกเลิกรายการรับเงินได้");
      }

      await tx.paymentTransaction.delete({ where: { id: transaction.id } });

      const [remainingTotals, lastTransaction] = await Promise.all([
        tx.paymentTransaction.aggregate({
          where: { workspaceId, memberRoundId: transaction.memberRoundId },
          _sum: { amount: true },
        }),
        tx.paymentTransaction.findFirst({
          where: { workspaceId, memberRoundId: transaction.memberRoundId },
          select: { paidAt: true },
          orderBy: { paidAt: "desc" },
        }),
      ]);

      const paidAmount = remainingTotals._sum.amount ?? 0;
      const recalculationBase = {
        paidAmount,
        targetAmount: transaction.memberRound.targetAmount,
        fineAmount: 0,
        status: paidAmount > 0 ? ("PARTIAL" as const) : ("UNPAID" as const),
      };
      const current = calculateCurrentMemberRound(recalculationBase, transaction.memberRound.round, new Date());
      const completed = current.outstandingAmount <= 0;

      const updated = await tx.memberRound.update({
        where: { id: transaction.memberRoundId },
        data: {
          paidAmount,
          fineAmount: current.currentFine,
          totalRequiredAmount: current.totalRequiredAmount,
          remainingAmount: current.outstandingAmount,
          status: current.currentStatus,
          completedAt: completed ? (lastTransaction?.paidAt ?? new Date()) : null,
        },
      });

      await writeActivityLog(tx, {
        workspaceId,
        userId,
        action: "CANCEL_PAYMENT",
        detail: `ยกเลิกรับเงิน ${transaction.member.fullName} จำนวน ${transaction.amount}`,
      });

      return { transaction, memberRound: updated };
    });

    revalidatePath("/");
    revalidatePath("/payments");
    revalidatePath("/payments/history");
    revalidatePath("/overdue");
    revalidatePath("/rounds");
    revalidatePath(`/rounds/${result.memberRound.roundId}`);
    revalidatePath("/reports");
    return successResult(result, "ยกเลิกรายการรับเงินสำเร็จ");
  } catch (error) {
    return errorResult(error instanceof Error ? error.message : "ไม่สามารถยกเลิกรายการรับเงินได้");
  }
}

export async function updatePaymentTransactionAction(transactionId: string, data: unknown) {
  try {
    const { workspaceId, userId } = await requireWorkspaceRole(COLLECT_PAYMENT);
    const parsed = updatePaymentTransactionSchema.safeParse(data);
    if (!parsed.success) return errorResult("ข้อมูลรายการชำระเงินไม่ถูกต้อง", parsed.error.flatten().fieldErrors);

    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.paymentTransaction.findFirst({
        where: { id: transactionId, workspaceId },
        include: {
          member: { select: { fullName: true } },
          memberRound: { include: { round: true } },
        },
      });
      if (!transaction) throw new Error("ไม่พบรายการชำระเงินใน workspace นี้");
      if (transaction.memberRound.round.status === "CANCELLED") throw new Error("รอบนี้ถูกยกเลิกแล้ว ไม่สามารถแก้ไขรายการชำระเงินได้");

      const method = await tx.paymentMethod.findFirst({
        where: { id: parsed.data.paymentMethodId, workspaceId, status: "ACTIVE" },
      });
      if (!method) throw new Error("วิธีชำระเงินไม่อยู่ใน workspace นี้");

      const otherTotal = await tx.paymentTransaction.aggregate({
        where: { workspaceId, memberRoundId: transaction.memberRoundId, NOT: { id: transaction.id } },
        _sum: { amount: true },
      });
      const currentWithoutThis = calculateCurrentMemberRound(
        { ...transaction.memberRound, paidAmount: otherTotal._sum.amount ?? 0, fineAmount: 0, status: (otherTotal._sum.amount ?? 0) > 0 ? "PARTIAL" : "UNPAID" },
        transaction.memberRound.round,
        parsed.data.paidAt,
      );
      if (parsed.data.amount > currentWithoutThis.outstandingAmount) throw new Error("จำนวนเงินเกินยอดค้างปัจจุบัน");

      const updatedTransaction = await tx.paymentTransaction.update({
        where: { id: transaction.id },
        data: {
          amount: parsed.data.amount,
          paymentMethodId: parsed.data.paymentMethodId,
          paidAt: parsed.data.paidAt,
          note: parsed.data.note,
        },
      });
      const updatedMemberRound = await recalculateMemberRoundAfterTransactionChange(tx as any, workspaceId, transaction.memberRoundId);

      await writeActivityLog(tx, {
        workspaceId,
        userId,
        action: "UPDATE_PAYMENT",
        detail: `แก้ไขรายการชำระเงิน ${transaction.member.fullName} จำนวน ${parsed.data.amount}`,
      });

      return { transaction: updatedTransaction, memberRound: updatedMemberRound };
    });

    revalidatePath("/");
    revalidatePath("/payments");
    revalidatePath("/payments/history");
    revalidatePath("/overdue");
    revalidatePath("/reports");
    revalidatePath(`/rounds/${result.memberRound.roundId}`);
    return successResult(result, "แก้ไขรายการชำระเงินสำเร็จ");
  } catch (error) {
    return errorResult(error instanceof Error ? error.message : "ไม่สามารถแก้ไขรายการชำระเงินได้");
  }
}

export async function waiveMemberRoundAction(memberRoundId: string, note?: string) {
  try {
    const { workspaceId, userId } = await requireWorkspaceRole(COLLECT_PAYMENT);
    const memberRound = await prisma.memberRound.findFirst({ where: { id: memberRoundId, workspaceId } });
    if (!memberRound) return errorResult("ไม่พบรายการใน workspace นี้");
    const updated = await prisma.memberRound.update({
      where: { id: memberRoundId },
      data: { status: "WAIVED", remainingAmount: 0 },
    });
    await writeActivityLog(prisma, { workspaceId, userId, action: "WAIVE_PAYMENT", detail: note });
    revalidatePath("/");
    return successResult(updated, "ยกเว้นยอดสำเร็จ");
  } catch {
    return errorResult("ไม่สามารถยกเว้นยอดได้");
  }
}

export async function getMemberRoundTransactionsAction(memberRoundId: string) {
  try {
    const { workspaceId } = await getCurrentWorkspaceOrThrow();
    const exists = await prisma.memberRound.findFirst({ where: { id: memberRoundId, workspaceId }, select: { id: true } });
    if (!exists) return errorResult("ไม่พบรายการใน workspace นี้");
    const transactions = await prisma.paymentTransaction.findMany({
      where: { workspaceId, memberRoundId },
      select: {
        id: true,
        amount: true,
        paidAt: true,
        note: true,
        paymentMethod: { select: { id: true, name: true, type: true } },
        collectedBy: { select: { id: true, fullName: true, username: true } },
      },
      orderBy: { paidAt: "desc" },
    });
    return successResult(transactions);
  } catch {
    return errorResult("ไม่สามารถดึงประวัติรับเงินได้");
  }
}

export async function getPaymentHistoryAction(filters: unknown = {}) {
  try {
    const { workspaceId } = await getCurrentWorkspaceOrThrow();
    const parsed = paymentHistoryFilterSchema.safeParse(filters);
    if (!parsed.success) return errorResult("ตัวกรองประวัติการชำระเงินไม่ถูกต้อง", parsed.error.flatten().fieldErrors);

    const startDate = parsed.data.startDate ? startOfDay(new Date(parsed.data.startDate)) : undefined;
    const endDate = parsed.data.endDate ? endOfDay(new Date(parsed.data.endDate)) : undefined;
    const member = parsed.data.member?.trim();

    const transactions = await prisma.paymentTransaction.findMany({
      where: {
        workspaceId,
        roundId: parsed.data.roundId || undefined,
        paidAt: startDate || endDate ? { gte: startDate, lte: endDate } : undefined,
        member: member
          ? {
              OR: [
                { fullName: { contains: member, mode: "insensitive" } },
                { memberCode: { contains: member, mode: "insensitive" } },
                { studentNo: { contains: member, mode: "insensitive" } },
                { phone: { contains: member, mode: "insensitive" } },
              ],
            }
          : undefined,
      },
      select: {
        id: true,
        amount: true,
        paidAt: true,
        note: true,
        member: { select: { id: true, memberCode: true, studentNo: true, fullName: true, classroom: true, phone: true } },
        round: { select: { id: true, title: true, status: true } },
        paymentMethod: { select: { id: true, name: true, type: true } },
        collectedBy: { select: { id: true, fullName: true, username: true } },
      },
      orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
      take: 300,
    });

    return successResult(transactions);
  } catch {
    return errorResult("ไม่สามารถดึงประวัติการชำระเงินได้");
  }
}

export async function getUnpaidAndPartialPaymentsAction(roundId?: string) {
  try {
    const { workspaceId } = await getCurrentWorkspaceOrThrow();
    const rows = await prisma.memberRound.findMany({
      where: { workspaceId, roundId, status: { in: [...unpaidStatuses] }, round: { status: "OPEN" } },
      select: {
        id: true,
        workspaceId: true,
        roundId: true,
        memberId: true,
        targetAmount: true,
        paidAmount: true,
        remainingAmount: true,
        fineAmount: true,
        totalRequiredAmount: true,
        status: true,
        completedAt: true,
        createdAt: true,
        updatedAt: true,
        member: {
          select: {
            id: true,
            memberCode: true,
            studentNo: true,
            fullName: true,
            classroom: true,
            phone: true,
            status: true,
          },
        },
        round: {
          select: {
            id: true,
            title: true,
            dueDate: true,
            fineEnabled: true,
            fineType: true,
            fineAmount: true,
            fineMaxAmount: true,
            status: true,
          },
        },
      },
      orderBy: [
        { round: { createdAt: "desc" } },
        { member: { studentNo: "asc" } },
        { member: { memberCode: "asc" } },
      ],
    });
    const today = new Date();
    return successResult(rows.map((row) => ({ ...row, current: calculateCurrentMemberRound(row, row.round, today) })));
  } catch {
    return errorResult("ไม่สามารถดึงข้อมูลคนค้างจ่ายได้");
  }
}
