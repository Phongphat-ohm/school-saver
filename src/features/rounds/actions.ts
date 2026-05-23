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
const roundMemberModes = ["COLLECT", "WAIVE", "SKIP"] as const;

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

type RoundMemberMode = (typeof roundMemberModes)[number];

function getCollectMemberRoundData(
  round: {
    targetAmount: number;
    dueDate: Date;
    fineEnabled: boolean;
    fineType: "NONE" | "DAILY" | "WEEKLY" | "FIXED";
    fineAmount: number;
    fineMaxAmount: number | null;
  },
  today = new Date(),
) {
  const current = calculateCurrentMemberRound(
    {
      paidAmount: 0,
      targetAmount: round.targetAmount,
      fineAmount: 0,
      status: "UNPAID",
    },
    round,
    today,
  );

  return {
    targetAmount: round.targetAmount,
    paidAmount: 0,
    remainingAmount: current.outstandingAmount,
    fineAmount: current.currentFine,
    totalRequiredAmount: current.totalRequiredAmount,
    status: current.currentStatus,
    completedAt: null,
  };
}

export async function getRoundMemberSelectionAction() {
  try {
    const { workspaceId } = await getCurrentWorkspaceOrThrow();
    const members = await prisma.member.findMany({
      where: { workspaceId, status: "ACTIVE" },
      select: { id: true, memberCode: true, studentNo: true, fullName: true, classroom: true },
      orderBy: [{ studentNo: "asc" }, { fullName: "asc" }],
    });
    return successResult(members);
  } catch {
    return errorResult("ไม่สามารถดึงรายชื่อสมาชิกสำหรับสร้างรอบได้");
  }
}

export async function createCollectionRoundAction(data: unknown) {
  try {
    const { workspaceId, userId } = await requireWorkspaceRole(OWNER_ADMIN);
    const parsed = collectionRoundSchema.safeParse(data);
    if (!parsed.success) return errorResult("ข้อมูลรอบไม่ถูกต้อง", parsed.error.flatten().fieldErrors);
    const members = await prisma.member.findMany({ where: { workspaceId, status: "ACTIVE" }, select: { id: true } });
    if (members.length === 0) return errorResult("ไม่สามารถสร้างรอบได้ เพราะยังไม่มีสมาชิก ACTIVE ใน workspace นี้");
    const { includedMemberIds, waivedMemberIds, ...roundData } = parsed.data;
    const activeMemberIds = new Set(members.map((member) => member.id));
    const requestedIncludedIds = includedMemberIds?.length ? new Set(includedMemberIds) : activeMemberIds;
    const requestedWaivedIds = new Set(waivedMemberIds ?? []);
    const waivedIds = members.map((member) => member.id).filter((id) => requestedWaivedIds.has(id));
    const waivedIdSet = new Set(waivedIds);
    const includedIds = members.map((member) => member.id).filter((id) => requestedIncludedIds.has(id) && activeMemberIds.has(id) && !waivedIdSet.has(id));
    if (includedIds.length + waivedIds.length === 0) return errorResult("กรุณาเลือกสมาชิกอย่างน้อย 1 คนสำหรับรอบนี้");

    const round = await prisma.$transaction(async (tx) => {
      const created = await tx.collectionRound.create({
        data: { workspaceId, createdById: userId, ...roundData, status: "OPEN" },
      });
      await tx.memberRound.createMany({
        data: [
          ...includedIds.map((memberId) => ({
            workspaceId,
            roundId: created.id,
            memberId,
            targetAmount: roundData.targetAmount,
            paidAmount: 0,
            remainingAmount: roundData.targetAmount,
            fineAmount: 0,
            totalRequiredAmount: roundData.targetAmount,
            status: "UNPAID" as const,
          })),
          ...waivedIds.map((memberId) => ({
            workspaceId,
            roundId: created.id,
            memberId,
            targetAmount: 0,
            paidAmount: 0,
            remainingAmount: 0,
            fineAmount: 0,
            totalRequiredAmount: 0,
            status: "WAIVED" as const,
          })),
        ],
      });
      await writeActivityLog(tx, { workspaceId, userId, action: "CREATE_ROUND", detail: `สร้างรอบ ${created.title} เก็บ ${includedIds.length} คน ยกเว้น ${waivedIds.length} คน` });
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
            transactions: {
              select: {
                id: true,
                amount: true,
                paidAt: true,
                note: true,
              },
              orderBy: { paidAt: "asc" },
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

export async function getRoundMemberManagementAction(roundId: string) {
  try {
    const { workspaceId } = await getCurrentWorkspaceOrThrow();
    const round = await prisma.collectionRound.findFirst({
      where: { id: roundId, workspaceId },
      select: {
        id: true,
        status: true,
        memberRounds: {
          select: {
            id: true,
            memberId: true,
            status: true,
            paidAmount: true,
            _count: { select: { transactions: true } },
            member: {
              select: {
                id: true,
                memberCode: true,
                studentNo: true,
                fullName: true,
                classroom: true,
                status: true,
              },
            },
          },
        },
      },
    });
    if (!round) return errorResult("ไม่พบรอบใน workspace นี้");

    const activeMembers = await prisma.member.findMany({
      where: { workspaceId, status: "ACTIVE" },
      select: { id: true, memberCode: true, studentNo: true, fullName: true, classroom: true, status: true },
      orderBy: [{ studentNo: "asc" }, { fullName: "asc" }],
    });

    const existingByMemberId = new Map(round.memberRounds.map((memberRound) => [memberRound.memberId, memberRound]));
    const memberById = new Map(activeMembers.map((member) => [member.id, member]));
    for (const memberRound of round.memberRounds) {
      memberById.set(memberRound.memberId, memberRound.member);
    }

    const members = Array.from(memberById.values()).sort((a, b) => {
      const studentNoCompare = String(a.studentNo ?? "").localeCompare(String(b.studentNo ?? ""), "th", { numeric: true });
      if (studentNoCompare !== 0) return studentNoCompare;
      return a.fullName.localeCompare(b.fullName, "th");
    });

    return successResult({
      roundStatus: round.status,
      members: members.map((member) => {
        const memberRound = existingByMemberId.get(member.id);
        const transactionCount = memberRound?._count.transactions ?? 0;
        const mode: RoundMemberMode = memberRound ? (memberRound.status === "WAIVED" ? "WAIVE" : "COLLECT") : "SKIP";
        return {
          memberId: member.id,
          memberCode: member.memberCode,
          studentNo: member.studentNo,
          fullName: member.fullName,
          classroom: member.classroom,
          memberStatus: member.status,
          mode,
          inRound: !!memberRound,
          transactionCount,
          locked: transactionCount > 0,
        };
      }),
    });
  } catch {
    return errorResult("ไม่สามารถดึงรายชื่อสมาชิกสำหรับจัดการรอบได้");
  }
}

export async function updateRoundMemberSelectionAction(roundId: string, selections: Array<{ memberId: string; mode: RoundMemberMode }>) {
  try {
    const { workspaceId, userId } = await requireWorkspaceRole(OWNER_ADMIN);
    const uniqueSelections = new Map<string, RoundMemberMode>();
    for (const selection of selections) {
      if (!selection?.memberId || !roundMemberModes.includes(selection.mode)) continue;
      uniqueSelections.set(selection.memberId, selection.mode);
    }
    if (uniqueSelections.size === 0) return errorResult("กรุณาเลือกสมาชิกอย่างน้อย 1 รายการ");

    const round = await prisma.collectionRound.findFirst({
      where: { id: roundId, workspaceId },
      select: {
        id: true,
        title: true,
        targetAmount: true,
        dueDate: true,
        fineEnabled: true,
        fineType: true,
        fineAmount: true,
        fineMaxAmount: true,
        status: true,
        memberRounds: {
          select: {
            id: true,
            memberId: true,
            status: true,
            paidAmount: true,
            _count: { select: { transactions: true } },
          },
        },
      },
    });
    if (!round) return errorResult("ไม่พบรอบใน workspace นี้");
    if (round.status !== "OPEN") return errorResult("แก้ไขสมาชิกในรอบได้เฉพาะรอบที่เปิดอยู่เท่านั้น");

    const memberIds = Array.from(uniqueSelections.keys());
    const validMembers = await prisma.member.findMany({
      where: {
        workspaceId,
        id: { in: memberIds },
        OR: [{ status: "ACTIVE" }, { memberRounds: { some: { roundId } } }],
      },
      select: { id: true },
    });
    const validMemberIds = new Set(validMembers.map((member) => member.id));
    const existingByMemberId = new Map(round.memberRounds.map((memberRound) => [memberRound.memberId, memberRound]));
    const today = new Date();
    let collectCount = 0;
    let waiveCount = 0;
    let skipCount = 0;

    await prisma.$transaction(async (tx) => {
      for (const [memberId, mode] of uniqueSelections.entries()) {
        if (!validMemberIds.has(memberId)) continue;
        const existing = existingByMemberId.get(memberId);
        const locked = (existing?._count.transactions ?? 0) > 0;
        if (locked && mode !== "COLLECT") {
          throw new Error("สมาชิกที่มีรายการชำระเงินแล้วต้องอยู่ในรอบแบบเก็บเงินต่อไป");
        }

        if (mode === "COLLECT") {
          collectCount += 1;
          if (existing) {
            if (locked) continue;
            await tx.memberRound.update({
              where: { id: existing.id },
              data: getCollectMemberRoundData(round, today),
            });
          } else {
            await tx.memberRound.create({
              data: {
                workspaceId,
                roundId,
                memberId,
                ...getCollectMemberRoundData(round, today),
              },
            });
          }
          continue;
        }

        if (mode === "WAIVE") {
          waiveCount += 1;
          if (existing) {
            await tx.memberRound.update({
              where: { id: existing.id },
              data: {
                targetAmount: 0,
                paidAmount: 0,
                remainingAmount: 0,
                fineAmount: 0,
                totalRequiredAmount: 0,
                status: "WAIVED",
                completedAt: null,
              },
            });
          } else {
            await tx.memberRound.create({
              data: {
                workspaceId,
                roundId,
                memberId,
                targetAmount: 0,
                paidAmount: 0,
                remainingAmount: 0,
                fineAmount: 0,
                totalRequiredAmount: 0,
                status: "WAIVED",
              },
            });
          }
          continue;
        }

        skipCount += 1;
        if (existing) await tx.memberRound.delete({ where: { id: existing.id } });
      }

      await writeActivityLog(tx, {
        workspaceId,
        userId,
        action: "UPDATE_ROUND_MEMBERS",
        detail: `แก้ไขสมาชิกในรอบ ${round.title} เก็บ ${collectCount} คน ยกเว้น ${waiveCount} คน ไม่รวม ${skipCount} คน`,
      });
    });

    revalidatePath("/rounds");
    revalidatePath(`/rounds/${roundId}`);
    revalidatePath("/payments");
    revalidatePath("/overdue");
    return successResult({ collectCount, waiveCount, skipCount }, "แก้ไขสมาชิกในรอบสำเร็จ");
  } catch (error) {
    return errorResult(error instanceof Error ? error.message : "ไม่สามารถแก้ไขสมาชิกในรอบได้");
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

      await writeActivityLog(tx, { workspaceId, userId, action: "RESTORE_CANCELLED_ROUND", detail: `คืนรอบที่ถูกยกเลิก ${round.title}` });

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
