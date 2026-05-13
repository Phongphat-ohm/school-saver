"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { COLLECT_PAYMENT, requireWorkspaceRole } from "@/lib/permissions";
import { getCurrentWorkspaceOrThrow } from "@/lib/workspace";
import { errorResult, successResult } from "@/lib/result";
import { calculateCurrentMemberRound } from "@/lib/fine";
import { paymentSchema } from "@/features/payments/schemas";

const unpaidStatuses = ["UNPAID", "PARTIAL", "OVERDUE", "PARTIAL_OVERDUE"] as const;

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
      include: {
        memberRounds: {
          where: { workspaceId, status: { in: [...unpaidStatuses] }, round: { status: "OPEN" } },
          include: { round: true },
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
        include: { round: true, member: true },
      });
      if (!memberRound) throw new Error("ไม่พบรายการสมาชิกในรอบนี้");
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
      await tx.activityLog.create({
        data: {
          workspaceId,
          userId,
          action: "COLLECT_PAYMENT",
          detail: `รับเงิน ${memberRound.member.fullName} จำนวน ${parsed.data.amount}`,
        },
      });
      return { transaction, memberRound: updated };
    });
    revalidatePath("/");
    revalidatePath("/payments");
    revalidatePath("/rounds");
    revalidatePath(`/rounds/${result.memberRound.roundId}`);
    return successResult(result, "บันทึกรับเงินสำเร็จ");
  } catch (error) {
    return errorResult(error instanceof Error ? error.message : "ไม่สามารถรับเงินได้");
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
    await prisma.activityLog.create({ data: { workspaceId, userId, action: "WAIVE_PAYMENT", detail: note } });
    revalidatePath("/");
    return successResult(updated, "ยกเว้นยอดสำเร็จ");
  } catch {
    return errorResult("ไม่สามารถยกเว้นยอดได้");
  }
}

export async function getMemberRoundTransactionsAction(memberRoundId: string) {
  try {
    const { workspaceId } = await getCurrentWorkspaceOrThrow();
    const exists = await prisma.memberRound.findFirst({ where: { id: memberRoundId, workspaceId } });
    if (!exists) return errorResult("ไม่พบรายการใน workspace นี้");
    const transactions = await prisma.paymentTransaction.findMany({
      where: { workspaceId, memberRoundId },
      include: { paymentMethod: true, collectedBy: { select: { fullName: true, username: true } } },
      orderBy: { paidAt: "desc" },
    });
    return successResult(transactions);
  } catch {
    return errorResult("ไม่สามารถดึงประวัติรับเงินได้");
  }
}

export async function getUnpaidAndPartialPaymentsAction(roundId?: string) {
  try {
    const { workspaceId } = await getCurrentWorkspaceOrThrow();
    const rows = await prisma.memberRound.findMany({
      where: { workspaceId, roundId, status: { in: [...unpaidStatuses] } },
      include: { member: true, round: true },
      orderBy: { remainingAmount: "desc" },
    });
    const today = new Date();
    return successResult(rows.map((row) => ({ ...row, current: calculateCurrentMemberRound(row, row.round, today) })));
  } catch {
    return errorResult("ไม่สามารถดึงข้อมูลคนค้างจ่ายได้");
  }
}
