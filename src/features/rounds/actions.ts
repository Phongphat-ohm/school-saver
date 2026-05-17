"use server";

import { revalidatePath } from "next/cache";
import { logActivity, writeActivityLog } from "@/lib/activity-log";
import { prisma } from "@/lib/prisma";
import { OWNER_ADMIN, requireWorkspaceRole } from "@/lib/permissions";
import { getCurrentWorkspaceOrThrow } from "@/lib/workspace";
import { errorResult, successResult } from "@/lib/result";
import { calculateCurrentMemberRound } from "@/lib/fine";
import { getDayList } from "@/lib/date";
import { collectionRoundSchema } from "@/features/rounds/schemas";

const payableStatuses = ["UNPAID", "PARTIAL", "OVERDUE", "PARTIAL_OVERDUE"] as const;

type SummaryInput = {
  status: string;
  targetAmount: number;
  paidAmount: number;
  remainingAmount: number;
  count?: number;
};

function summarize(memberRounds: SummaryInput[]) {
  return {
    totalMembers: memberRounds.reduce((sum, item) => sum + (item.count ?? 1), 0),
    paidCount: memberRounds
      .filter((item) => item.status === "PAID" || item.status === "LATE_PAID")
      .reduce((sum, item) => sum + (item.count ?? 1), 0),
    partialCount: memberRounds
      .filter((item) => item.status === "PARTIAL" || item.status === "PARTIAL_OVERDUE")
      .reduce((sum, item) => sum + (item.count ?? 1), 0),
    unpaidCount: memberRounds.filter((item) => item.status === "UNPAID").reduce((sum, item) => sum + (item.count ?? 1), 0),
    overdueCount: memberRounds
      .filter((item) => item.status === "OVERDUE" || item.status === "PARTIAL_OVERDUE")
      .reduce((sum, item) => sum + (item.count ?? 1), 0),
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
    const members = await prisma.member.findMany({ where: { workspaceId, status: "ACTIVE" }, select: { id: true } });
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
    const { workspaceId, userId } = await requireWorkspaceRole(OWNER_ADMIN);
    const parsed = collectionRoundSchema.safeParse(data);
    if (!parsed.success) return errorResult("ข้อมูลรอบไม่ถูกต้อง", parsed.error.flatten().fieldErrors);
    const round = await prisma.collectionRound.findFirst({
      where: { id: roundId, workspaceId },
      select: {
        id: true,
        targetAmount: true,
        status: true,
        _count: { select: { paymentTransactions: true } },
      },
    });
    if (!round) return errorResult("ไม่พบรอบใน workspace นี้");
    if (round.status === "CANCELLED" || round.status === "CLOSED") return errorResult("รอบนี้ปิดหรือยกเลิกแล้ว ไม่สามารถแก้ไขได้");
    const hasPayments = round._count.paymentTransactions > 0;
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
      await writeActivityLog(tx, { workspaceId, userId, action: "UPDATE_ROUND", detail: `แก้ไขรอบ ${saved.title}` });
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
    const [rounds, memberRoundSummaries] = await Promise.all([
      prisma.collectionRound.findMany({
        where: { workspaceId },
        select: {
          id: true,
          workspaceId: true,
          title: true,
          description: true,
          targetAmount: true,
          startDate: true,
          dueDate: true,
          fineEnabled: true,
          fineType: true,
          fineAmount: true,
          fineMaxAmount: true,
          status: true,
          createdById: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.memberRound.groupBy({
        by: ["roundId", "status"],
        where: { workspaceId },
        _count: { _all: true },
        _sum: { targetAmount: true, paidAmount: true, remainingAmount: true },
      }),
    ]);

    const summaryByRoundId = new Map<string, SummaryInput[]>();
    for (const row of memberRoundSummaries) {
      const items = summaryByRoundId.get(row.roundId) ?? [];
      items.push({
        status: row.status,
        count: row._count._all,
        targetAmount: row._sum.targetAmount ?? 0,
        paidAmount: row._sum.paidAmount ?? 0,
        remainingAmount: row._sum.remainingAmount ?? 0,
      });
      summaryByRoundId.set(row.roundId, items);
    }

    return successResult(rounds.map((round) => ({ ...round, summary: summarize(summaryByRoundId.get(round.id) ?? []) })));
  } catch {
    return errorResult("ไม่สามารถดึงรอบเก็บเงินได้");
  }
}

export async function getRoundDetailAction(roundId: string) {
  try {
    const { workspaceId } = await getCurrentWorkspaceOrThrow();
    const round = await prisma.collectionRound.findFirst({
      where: { id: roundId, workspaceId },
      select: {
        id: true,
        workspaceId: true,
        title: true,
        description: true,
        targetAmount: true,
        startDate: true,
        dueDate: true,
        fineEnabled: true,
        fineType: true,
        fineAmount: true,
        fineMaxAmount: true,
        status: true,
        createdById: true,
        createdAt: true,
        updatedAt: true,
        memberRounds: {
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
          },
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
    const { workspaceId, userId } = await requireWorkspaceRole(OWNER_ADMIN);
    const round = await prisma.collectionRound.findFirst({ where: { id: roundId, workspaceId }, select: { id: true, status: true } });
    if (!round) return errorResult("ไม่พบรอบใน workspace นี้");
    if (round.status !== "OPEN") return errorResult("ปิดได้เฉพาะรอบที่เปิดอยู่เท่านั้น");
    const updated = await prisma.collectionRound.update({ where: { id: roundId }, data: { status: "CLOSED" } });
    await logActivity({ workspaceId, userId, action: "CLOSE_ROUND", detail: `ปิดรอบ ${updated.title}` });
    revalidatePath("/rounds");
    revalidatePath(`/rounds/${roundId}`);
    return successResult(updated, "ปิดรอบสำเร็จ");
  } catch {
    return errorResult("ไม่สามารถปิดรอบได้");
  }
}

export async function openRoundAction(roundId: string) {
  try {
    const { workspaceId, userId } = await requireWorkspaceRole(OWNER_ADMIN);
    const round = await prisma.collectionRound.findFirst({ where: { id: roundId, workspaceId }, select: { id: true, status: true } });
    if (!round) return errorResult("ไม่พบรอบใน workspace นี้");
    if (round.status !== "CLOSED") return errorResult("เปิดกลับได้เฉพาะรอบที่ปิดอยู่เท่านั้น");
    const updated = await prisma.collectionRound.update({ where: { id: roundId }, data: { status: "OPEN" } });
    await logActivity({ workspaceId, userId, action: "OPEN_ROUND", detail: `เปิดรอบ ${updated.title}` });
    revalidatePath("/rounds");
    revalidatePath(`/rounds/${roundId}`);
    return successResult(updated, "เปิดรอบสำเร็จ");
  } catch {
    return errorResult("ไม่สามารถเปิดรอบได้");
  }
}

export async function cancelRoundAction(roundId: string) {
  try {
    const { workspaceId, userId } = await requireWorkspaceRole(OWNER_ADMIN);
    const round = await prisma.collectionRound.findFirst({ where: { id: roundId, workspaceId }, select: { id: true, status: true } });
    if (!round) return errorResult("ไม่พบรอบใน workspace นี้");
    if (round.status === "CANCELLED") return errorResult("รอบนี้ถูกยกเลิกแล้ว");
    const updated = await prisma.$transaction(async (tx) => {
      const saved = await tx.collectionRound.update({ where: { id: roundId }, data: { status: "CANCELLED" } });
      await tx.memberRound.updateMany({
        where: { workspaceId, roundId, status: { in: [...payableStatuses] } },
        data: { status: "WAIVED", remainingAmount: 0, fineAmount: 0 },
      });
      await writeActivityLog(tx, { workspaceId, userId, action: "CANCEL_ROUND", detail: `ยกเลิกรอบ ${saved.title}` });
      return saved;
    });
    revalidatePath("/rounds");
    revalidatePath(`/rounds/${roundId}`);
    revalidatePath("/payments");
    revalidatePath("/overdue");
    return successResult(updated, "ยกเลิกรอบสำเร็จ");
  } catch {
    return errorResult("ไม่สามารถยกเลิกรอบได้");
  }
}

export async function restoreCancelledRoundAction(roundId: string) {
  try {
    const { workspaceId, userId } = await requireWorkspaceRole(OWNER_ADMIN);
    const round = await prisma.collectionRound.findFirst({
      where: { id: roundId, workspaceId },
      include: { memberRounds: true },
    });
    if (!round) return errorResult("ไม่พบรอบใน workspace นี้");
    if (round.status !== "CANCELLED") return errorResult("คืนรอบได้เฉพาะรอบที่ถูกยกเลิกแล้วเท่านั้น");

    const today = new Date();
    const updated = await prisma.$transaction(async (tx) => {
      const saved = await tx.collectionRound.update({ where: { id: roundId }, data: { status: "OPEN" } });
      const cancelledMemberRounds = round.memberRounds.filter(
        (memberRound) => memberRound.status === "WAIVED" && memberRound.updatedAt >= round.updatedAt,
      );

      await Promise.all(
        cancelledMemberRounds.map((memberRound) => {
          const current = calculateCurrentMemberRound(
            {
              ...memberRound,
              fineAmount: 0,
              status: memberRound.paidAmount > 0 ? "PARTIAL" : "UNPAID",
            },
            round,
            today,
          );
          return tx.memberRound.update({
            where: { id: memberRound.id },
            data: {
              fineAmount: current.currentFine,
              remainingAmount: current.outstandingAmount,
              totalRequiredAmount: current.totalRequiredAmount,
              status: current.currentStatus,
              completedAt: null,
            },
          });
        }),
      );

      await tx.activityLog.create({
        data: { workspaceId, userId, action: "RESTORE_CANCELLED_ROUND", detail: `คืนรอบที่ถูกยกเลิก ${round.title}` },
      });

      return saved;
    });

    revalidatePath("/rounds");
    revalidatePath(`/rounds/${roundId}`);
    revalidatePath("/payments");
    revalidatePath("/overdue");
    return successResult(updated, "ยกเลิกการยกเลิกรอบสำเร็จ");
  } catch {
    return errorResult("ไม่สามารถยกเลิกการยกเลิกรอบได้");
  }
}
