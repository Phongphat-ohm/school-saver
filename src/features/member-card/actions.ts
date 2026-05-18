"use server";

import { prisma } from "@/lib/prisma";
import { calculateCurrentMemberRound } from "@/lib/fine";
import { errorResult, successResult } from "@/lib/result";

export async function getMemberCardWorkspaceAction(token: string) {
  try {
    const workspace = await prisma.workspace.findUnique({
      where: { memberCardToken: token },
      select: { id: true, name: true, description: true, memberCardToken: true },
    });
    if (!workspace) return errorResult("ไม่พบ workspace สำหรับบัตรสมาชิก");
    return successResult(workspace);
  } catch {
    return errorResult("ไม่สามารถโหลดข้อมูล workspace ได้");
  }
}

export async function searchPublicMemberCardAction(token: string, keyword: string) {
  try {
    const trimmed = keyword.trim();
    if (trimmed.length < 2) return errorResult("กรุณากรอกข้อมูลค้นหาอย่างน้อย 2 ตัวอักษร");

    const workspace = await prisma.workspace.findUnique({
      where: { memberCardToken: token },
      select: {
        id: true,
        name: true,
        paymentMethods: {
          where: { status: "ACTIVE" },
          select: { id: true, name: true, type: true, accountName: true, accountNumber: true, bankName: true, qrImageUrl: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!workspace) return errorResult("ไม่พบ workspace สำหรับบัตรสมาชิก");

    const member = await prisma.member.findFirst({
      where: {
        workspaceId: workspace.id,
        status: "ACTIVE",
        OR: [
          { memberCode: { equals: trimmed, mode: "insensitive" } },
          { studentNo: { equals: trimmed, mode: "insensitive" } },
          { phone: { equals: trimmed, mode: "insensitive" } },
          { fullName: { contains: trimmed, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        memberCode: true,
        studentNo: true,
        fullName: true,
        classroom: true,
        phone: true,
        memberRounds: {
          where: { round: { status: { in: ["OPEN", "CLOSED"] } } },
          select: {
            id: true,
            targetAmount: true,
            paidAmount: true,
            remainingAmount: true,
            fineAmount: true,
            totalRequiredAmount: true,
            status: true,
            completedAt: true,
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
            transactions: {
              select: {
                id: true,
                amount: true,
                paidAt: true,
                note: true,
                paymentMethod: { select: { id: true, name: true, type: true } },
              },
              orderBy: { paidAt: "desc" },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });
    if (!member) return errorResult("ไม่พบสมาชิกตามข้อมูลที่ค้นหา");

    const today = new Date();
    const memberRounds = member.memberRounds.map((memberRound) => ({
      ...memberRound,
      current: calculateCurrentMemberRound(memberRound, memberRound.round, today),
    }));

    return successResult({
      workspace,
      member: { ...member, memberRounds },
      totals: {
        paid: memberRounds.reduce((sum, item) => sum + item.paidAmount, 0),
        outstanding: memberRounds.reduce((sum, item) => sum + item.current.outstandingAmount, 0),
        fine: memberRounds.reduce((sum, item) => sum + item.current.currentFine, 0),
      },
    });
  } catch {
    return errorResult("ไม่สามารถค้นหาบัตรสมาชิกได้");
  }
}
