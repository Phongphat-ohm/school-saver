"use server";

import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { calculateCurrentMemberRound } from "@/lib/fine";
import { errorResult, successResult } from "@/lib/result";

const LOOKUP_FAILURE_WINDOW_MINUTES = 10;
const LOOKUP_FAILURE_LIMIT = 5;

type PublicMemberCardLookupInput = {
  identifier?: string;
  verifier?: string;
};

export async function getMemberCardWorkspaceAction(token: string) {
  try {
    const workspace = await prisma.workspace.findFirst({
      where: { memberCardToken: token, status: "ACTIVE" },
      select: { id: true, name: true, description: true, memberCardToken: true },
    });
    if (!workspace) return errorResult("ไม่พบ workspace สำหรับบัตรสมาชิก");
    return successResult(workspace);
  } catch {
    return errorResult("ไม่สามารถโหลดข้อมูล workspace ได้");
  }
}

export async function searchPublicMemberCardAction(token: string, input: PublicMemberCardLookupInput) {
  try {
    const identifier = input.identifier?.trim() ?? "";
    const verifier = input.verifier?.trim() ?? "";
    if (identifier.length < 2) return errorResult("กรุณากรอกรหัสสมาชิกหรือเลขที่อย่างน้อย 2 ตัวอักษร");
    if (verifier.length < 2) return errorResult("กรุณากรอกข้อมูลยืนยัน เช่น เบอร์โทร 4 หลักท้าย หรือเลขที่");

    const metadata = await getPublicLookupMetadata();
    if (await isPublicLookupBlocked(metadata.ipAddress)) {
      await writePublicLookupLog({
        token,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        outcome: "BLOCKED",
        detail: "Public member-card lookup blocked by rate limit",
      });
      return errorResult("ค้นหาผิดหลายครั้ง กรุณารอสักครู่ก่อนลองใหม่", undefined, { retryAfterSeconds: LOOKUP_FAILURE_WINDOW_MINUTES * 60 });
    }

    const workspace = await prisma.workspace.findFirst({
      where: { memberCardToken: token, status: "ACTIVE" },
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

    const candidates = await prisma.member.findMany({
      where: {
        workspaceId: workspace.id,
        status: "ACTIVE",
        OR: [
          { memberCode: { equals: identifier, mode: "insensitive" } },
          { studentNo: { equals: identifier, mode: "insensitive" } },
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
                paymentMethod: { select: { id: true, name: true, type: true } },
              },
              orderBy: { paidAt: "desc" },
              take: 20,
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
      take: 2,
    });
    const member = candidates[0];
    if (!member) {
      await writePublicLookupLog({
        workspaceId: workspace.id,
        token,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        outcome: "FAILURE",
        detail: `No member matched identifier: ${identifier}`,
      });
      return errorResult("ไม่พบสมาชิกตามข้อมูลที่ค้นหา");
    }
    if (candidates.length > 1) {
      await writePublicLookupLog({
        workspaceId: workspace.id,
        token,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        outcome: "FAILURE",
        detail: `Ambiguous public member-card identifier: ${identifier}`,
      });
      return errorResult("พบข้อมูลซ้ำ กรุณาค้นหาด้วยรหัสสมาชิกแทนเลขที่");
    }
    if (!isVerifiedMemberLookup(member, identifier, verifier)) {
      await writePublicLookupLog({
        workspaceId: workspace.id,
        token,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        outcome: "FAILURE",
        detail: `Verifier mismatch for member: ${member.id}`,
      });
      return errorResult("ข้อมูลยืนยันไม่ตรงกับสมาชิก กรุณาตรวจสอบอีกครั้ง");
    }

    const today = new Date();
    const memberRounds = member.memberRounds.map((memberRound) => ({
      ...memberRound,
      current: calculateCurrentMemberRound(memberRound, memberRound.round, today),
    }));

    return successResult({
      workspace,
      member: {
        ...member,
        phone: undefined,
        maskedPhone: maskPhone(member.phone),
        memberRounds,
      },
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

function isVerifiedMemberLookup(
  member: { memberCode: string; studentNo: string | null; phone: string | null },
  identifier: string,
  verifier: string,
) {
  const normalizedIdentifier = normalizeLookupText(identifier);
  const normalizedVerifier = normalizeLookupText(verifier);
  const phoneDigits = onlyDigits(member.phone);
  const verifierDigits = onlyDigits(verifier);

  if (phoneDigits.length >= 4) {
    return verifierDigits.length === 4 && phoneDigits.endsWith(verifierDigits);
  }

  const memberCode = normalizeLookupText(member.memberCode);
  const studentNo = normalizeLookupText(member.studentNo);
  if (studentNo && normalizedIdentifier !== studentNo && normalizedVerifier === studentNo) return true;
  if (memberCode && normalizedIdentifier !== memberCode && normalizedVerifier === memberCode) return true;
  return false;
}

function normalizeLookupText(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function onlyDigits(value: string | null | undefined) {
  return (value ?? "").replace(/\D/g, "");
}

function maskPhone(value: string | null) {
  const digits = onlyDigits(value);
  if (digits.length < 4) return null;
  return `xxx-xxx-${digits.slice(-4)}`;
}

async function isPublicLookupBlocked(ipAddress: string | null) {
  if (!ipAddress) return false;
  const since = new Date(Date.now() - LOOKUP_FAILURE_WINDOW_MINUTES * 60 * 1000);
  const failureCount = await prisma.activityLog.count({
    where: {
      action: "PUBLIC_MEMBER_CARD_LOOKUP_FAILED",
      ipAddress,
      outcome: "FAILURE",
      createdAt: { gte: since },
    },
  });
  return failureCount >= LOOKUP_FAILURE_LIMIT;
}

async function writePublicLookupLog(input: {
  workspaceId?: string | null;
  token: string;
  ipAddress: string | null;
  userAgent: string | null;
  outcome: "FAILURE" | "BLOCKED";
  detail: string;
}) {
  await prisma.activityLog.create({
    data: {
      workspaceId: input.workspaceId ?? null,
      action: input.outcome === "BLOCKED" ? "PUBLIC_MEMBER_CARD_LOOKUP_BLOCKED" : "PUBLIC_MEMBER_CARD_LOOKUP_FAILED",
      detail: `${input.detail} (${input.token.slice(0, 8)})`,
      outcome: input.outcome,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      method: "POST",
      path: "/member-card/[token]",
    },
  });
}

async function getPublicLookupMetadata() {
  try {
    const headerStore = await headers();
    return {
      ipAddress: truncate(headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? headerStore.get("x-real-ip") ?? headerStore.get("cf-connecting-ip"), 64),
      userAgent: truncate(headerStore.get("user-agent"), 512),
    };
  } catch {
    return { ipAddress: null, userAgent: null };
  }
}

function truncate(value: string | null | undefined, maxLength: number) {
  if (!value) return null;
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}
