"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { OWNER_ADMIN, requireWorkspaceRole } from "@/lib/permissions";
import { getCurrentWorkspaceOrThrow } from "@/lib/workspace";
import { errorResult, successResult } from "@/lib/result";
import { calculateCurrentMemberRound } from "@/lib/fine";
import { getDayList } from "@/lib/date";
import { collectionRoundSchema } from "@/features/rounds/schemas";

function summarize(memberRounds: Array<{ status: string; targetAmount: number; paidAmount: number; remainingAmount: number }>) {
  return {
    totalMembers: memberRounds.length,
    paidCount: memberRounds.filter((item) => item.status === "PAID" || item.status === "LATE_PAID").length,
    partialCount: memberRounds.filter((item) => item.status === "PARTIAL" || item.status === "PARTIAL_OVERDUE").length,
    unpaidCount: memberRounds.filter((item) => item.status === "UNPAID").length,
    overdueCount: memberRounds.filter((item) => item.status === "OVERDUE" || item.status === "PARTIAL_OVERDUE").length,
    totalTargetAmount: memberRounds.reduce((sum, item) => sum + item.targetAmount, 0),
    totalPaidAmount: memberRounds.reduce((sum, item) => sum + item.paidAmount, 0),
    totalOutstandingAmount: memberRounds.reduce((sum, item) => sum + item.remainingAmount, 0),
  };
}

export async function createCollectionRoundAction(data: unknown) {
  try {
    const { workspaceId, userId } = await requireWorkspaceRole(OWNER_ADMIN);
    const parsed = collectionRoundSchema.safeParse(data);
    if (!parsed.success) return errorResult("ข้อมูลรอบไม่ถูกต้อง", parsed.error.flatten().fieldErrors);
    const members = await prisma.member.findMany({ where: { workspaceId, status: "ACTIVE" } });
    if (members.length === 0) return errorResult("ไม่สามารถสร้างรอบได้ เพราะยังไม่มีสมาชิก ACTIVE ใน workspace นี้");

    const round = await prisma.$transaction(async (tx) => {
      const created = await tx.collectionRound.create({
        data: { workspaceId, createdById: userId, ...parsed.data, status: "OPEN" },
      });
      await tx.memberRound.createMany({
        data: members.map((member) => ({
          workspaceId,
          roundId: created.id,
          memberId: member.id,
          targetAmount: parsed.data.targetAmount,
          paidAmount: 0,
          remainingAmount: parsed.data.targetAmount,
          fineAmount: 0,
          totalRequiredAmount: parsed.data.targetAmount,
          status: "UNPAID" as const,
        })),
      });
      await tx.activityLog.create({
        data: { workspaceId, userId, action: "CREATE_ROUND", detail: `สร้างรอบ ${created.title}` },
      });
      return created;
    });
    revalidatePath("/rounds");
    return successResult(round, "สร้างรอบเก็บเงินสำเร็จ");
  } catch (error) {
    return errorResult(error instanceof Error ? error.message : "ไม่สามารถสร้างรอบได้");
  }
}

export async function updateCollectionRoundAction(roundId: string, data: unknown) {
  try {
    const { workspaceId } = await requireWorkspaceRole(OWNER_ADMIN);
    const parsed = collectionRoundSchema.safeParse(data);
    if (!parsed.success) return errorResult("ข้อมูลรอบไม่ถูกต้อง", parsed.error.flatten().fieldErrors);
    const round = await prisma.collectionRound.findFirst({
      where: { id: roundId, workspaceId },
      include: { memberRounds: true, paymentTransactions: true },
    });
    if (!round) return errorResult("ไม่พบรอบใน workspace นี้");
    if (round.status === "CANCELLED" || round.status === "CLOSED") return errorResult("รอบนี้ปิดหรือยกเลิกแล้ว ไม่สามารถแก้ไขได้");
    const hasPayments = round.paymentTransactions.length > 0;
    if (hasPayments && parsed.data.targetAmount !== round.targetAmount) {
      return errorResult("รอบนี้มีรายการรับเงินแล้ว จึงไม่สามารถแก้ไขยอดเป้าหมายต่อคนได้");
    }

    const updated = await prisma.$transaction(async (tx) => {
      const saved = await tx.collectionRound.update({
        where: { id: roundId },
        data: {
          title: parsed.data.title,
          description: parsed.data.description,
          targetAmount: parsed.data.targetAmount,
          startDate: parsed.data.startDate,
          dueDate: parsed.data.dueDate,
          fineEnabled: parsed.data.fineEnabled,
          fineType: parsed.data.fineType,
          fineAmount: parsed.data.fineAmount,
          fineMaxAmount: parsed.data.fineMaxAmount,
        },
      });

      if (!hasPayments && parsed.data.targetAmount !== round.targetAmount) {
        await tx.memberRound.updateMany({
          where: { workspaceId, roundId },
          data: {
            targetAmount: parsed.data.targetAmount,
            remainingAmount: parsed.data.targetAmount,
            totalRequiredAmount: parsed.data.targetAmount,
          },
        });
      }
      return saved;
    });

    revalidatePath("/rounds");
    revalidatePath(`/rounds/${roundId}`);
    return successResult(updated, "แก้ไขรอบเก็บเงินสำเร็จ");
  } catch (error) {
    return errorResult(error instanceof Error ? error.message : "ไม่สามารถแก้ไขรอบได้");
  }
}

export async function getCollectionRoundsAction() {
  try {
    const { workspaceId } = await getCurrentWorkspaceOrThrow();
    const rounds = await prisma.collectionRound.findMany({
      where: { workspaceId },
      include: {
        memberRounds: {
          select: {
            status: true,
            targetAmount: true,
            paidAmount: true,
            remainingAmount: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return successResult(rounds.map((round) => ({ ...round, summary: summarize(round.memberRounds) })));
  } catch {
    return errorResult("ไม่สามารถดึงรอบเก็บเงินได้");
  }
}

export async function getRoundDetailAction(roundId: string) {
  try {
    const { workspaceId } = await getCurrentWorkspaceOrThrow();
    const round = await prisma.collectionRound.findFirst({
      where: { id: roundId, workspaceId },
      include: {
        memberRounds: {
          include: { member: true },
          orderBy: { member: { studentNo: "asc" } },
        },
      },
    });
    if (!round) return errorResult("ไม่พบรอบใน workspace นี้");
    const today = new Date();
    const memberRounds = round.memberRounds.map((memberRound) => ({
      ...memberRound,
      current: calculateCurrentMemberRound(memberRound, round, today),
    }));
    const summary = summarize(
      memberRounds.map((item) => ({
        status: item.current.currentStatus,
        targetAmount: item.targetAmount,
        paidAmount: item.paidAmount,
        remainingAmount: item.current.outstandingAmount,
      })),
    );
    return successResult({ round, memberRounds, summary, dayList: getDayList(round.startDate, round.dueDate) });
  } catch {
    return errorResult("ไม่สามารถดึงรายละเอียดรอบได้");
  }
}

export async function closeRoundAction(roundId: string) {
  try {
    const { workspaceId } = await requireWorkspaceRole(OWNER_ADMIN);
    const round = await prisma.collectionRound.findFirst({ where: { id: roundId, workspaceId } });
    if (!round) return errorResult("ไม่พบรอบใน workspace นี้");
    const updated = await prisma.collectionRound.update({ where: { id: roundId }, data: { status: "CLOSED" } });
    revalidatePath("/rounds");
    return successResult(updated, "ปิดรอบสำเร็จ");
  } catch {
    return errorResult("ไม่สามารถปิดรอบได้");
  }
}

export async function cancelRoundAction(roundId: string) {
  try {
    const { workspaceId } = await requireWorkspaceRole(OWNER_ADMIN);
    const round = await prisma.collectionRound.findFirst({ where: { id: roundId, workspaceId } });
    if (!round) return errorResult("ไม่พบรอบใน workspace นี้");
    const updated = await prisma.collectionRound.update({ where: { id: roundId }, data: { status: "CANCELLED" } });
    revalidatePath("/rounds");
    return successResult(updated, "ยกเลิกรอบสำเร็จ");
  } catch {
    return errorResult("ไม่สามารถยกเลิกรอบได้");
  }
}
