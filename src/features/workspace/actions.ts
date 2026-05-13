"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { defaultPaymentMethods } from "@/constants/payment-methods";
import { OWNER_ADMIN, OWNER_ONLY, requireWorkspaceRole } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { errorResult, successResult } from "@/lib/result";
import { getSession, setCurrentWorkspace } from "@/lib/session";
import { getCurrentWorkspaceOrThrow } from "@/lib/workspace";
import {
  inviteUserSchema,
  approveJoinRequestSchema,
  removeWorkspaceMemberSchema,
  requestJoinWorkspaceSchema,
  sendWorkspaceInvitationSchema,
  updateWorkspaceMemberRoleSchema,
  workspaceSchema,
  workspaceUserSearchSchema,
} from "@/features/workspace/schemas";

export async function getMyWorkspacesAction() {
  try {
    const session = await getSession();
    if (!session) return errorResult("กรุณาเข้าสู่ระบบ");
    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: session.userId, status: "ACTIVE" },
      include: { workspace: true },
      orderBy: { createdAt: "asc" },
    });
    return successResult(memberships.map((item) => ({ ...item.workspace, role: item.role })));
  } catch {
    return errorResult("ไม่สามารถดึง workspace ได้");
  }
}

export async function getCurrentWorkspaceAction() {
  try {
    const current = await getCurrentWorkspaceOrThrow();
    return successResult({ ...current.workspace, role: current.role });
  } catch {
    return errorResult("ไม่พบ workspace ปัจจุบัน");
  }
}

export async function generateWorkspaceJoinQrAction(workspaceId: string) {
  try {
    const current = await requireWorkspaceRole(OWNER_ADMIN);

    if (current.workspaceId !== workspaceId) {
      return errorResult("ไม่มีสิทธิ์สร้าง QR สำหรับ workspace นี้");
    }

    const requestHeaders = await headers();

    const host =
      requestHeaders.get("x-forwarded-host") ??
      requestHeaders.get("host") ??
      "localhost:3000";

    const protocol =
      requestHeaders.get("x-forwarded-proto") ??
      (host.includes("localhost") ? "http" : "https");

    const serverOrigin = `${protocol}://${host}`;
    const joinUrl = `${serverOrigin}/workspaces/join/${workspaceId}`;

    const qrSvg = await QRCode.toString(joinUrl, {
      type: "svg",
      errorCorrectionLevel: "H",
      margin: 2,
      width: 512,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    });

    const logoUrl = `${serverOrigin}/images/school-saver-logo.webp`;

    const logoResponse = await fetch(logoUrl, {
      cache: "force-cache",
    });

    if (!logoResponse.ok) {
      return errorResult("ไม่พบไฟล์โลโก้สำหรับสร้าง QR");
    }

    const logoBase64 = Buffer.from(await logoResponse.arrayBuffer()).toString("base64");

    /**
     * QRCode SVG ส่วนใหญ่ไม่ได้ใช้ viewBox 0 0 512 512
     * แต่จะเป็นประมาณ 0 0 41 41 หรือใกล้เคียง
     */
    const viewBoxMatch = qrSvg.match(/viewBox="([^"]+)"/);

    if (!viewBoxMatch) {
      return errorResult("ไม่สามารถอ่านขนาด QR Code ได้");
    }

    const [, viewBoxValue] = viewBoxMatch;
    const [, , viewBoxWidth, viewBoxHeight] = viewBoxValue
      .split(" ")
      .map(Number);

    const logoSize = viewBoxWidth * 0.2;
    const logoPadding = viewBoxWidth * 0;

    const rectSize = logoSize + logoPadding * 2;
    const rectX = (viewBoxWidth - rectSize) / 2;
    const rectY = (viewBoxHeight - rectSize) / 2;

    const logoX = (viewBoxWidth - logoSize) / 2;
    const logoY = (viewBoxHeight - logoSize) / 2;

    const logoMarkup = `
      <g id="school-saver-logo">
        <image 
          href="data:image/webp;base64,${logoBase64}" 
          x="${logoX}" 
          y="${logoY}" 
          width="${logoSize}" 
          height="${logoSize}" 
          preserveAspectRatio="xMidYMid meet"
        />
      </g>
    `;

    const qrWithLogoSvg = qrSvg.replace("</svg>", `${logoMarkup}</svg>`);

    return successResult({
      joinUrl,
      logoUrl,
      qrSvg: qrWithLogoSvg,
    });
  } catch (error) {
    console.error(error);
    return errorResult("ไม่สามารถสร้าง QR เข้า workspace ได้");
  }
}

export async function getWorkspaceByIdForJoinAction(workspaceId: string) {
  try {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true, name: true, description: true },
    });
    if (!workspace) return errorResult("ไม่พบ workspace นี้");
    return successResult(workspace);
  } catch {
    return errorResult("ไม่สามารถดึงข้อมูล workspace ได้");
  }
}

export async function createWorkspaceAction(data: unknown) {
  try {
    const session = await getSession();
    if (!session) return errorResult("กรุณาเข้าสู่ระบบ");
    const parsed = workspaceSchema.safeParse(data);
    if (!parsed.success) return errorResult("ข้อมูล workspace ไม่ถูกต้อง", parsed.error.flatten().fieldErrors);

    const workspace = await prisma.$transaction(async (tx) => {
      const created = await tx.workspace.create({
        data: {
          name: parsed.data.name,
          description: parsed.data.description,
          ownerId: session.userId,
        },
      });
      await tx.workspaceMember.create({
        data: { workspaceId: created.id, userId: session.userId, role: "OWNER", status: "ACTIVE" },
      });
      await tx.paymentMethod.createMany({
        data: defaultPaymentMethods.map((method) => ({
          workspaceId: created.id,
          name: method.name,
          type: method.type,
          status: "ACTIVE" as const,
        })),
      });
      return created;
    });

    await setCurrentWorkspace(workspace.id);
    revalidatePath("/");
    return successResult(workspace, "สร้าง workspace และสลับมาใช้งานแล้ว");
  } catch {
    return errorResult("ไม่สามารถสร้าง workspace ได้");
  }
}

export async function updateCurrentWorkspaceAction(data: unknown) {
  try {
    const { workspaceId } = await requireWorkspaceRole(OWNER_ADMIN);
    const parsed = workspaceSchema.safeParse(data);
    if (!parsed.success) return errorResult("ข้อมูล workspace ไม่ถูกต้อง", parsed.error.flatten().fieldErrors);
    const workspace = await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        name: parsed.data.name,
        description: parsed.data.description,
      },
    });
    revalidatePath("/");
    return successResult(workspace, "แก้ไข workspace สำเร็จ");
  } catch (error) {
    return errorResult(error instanceof Error ? error.message : "ไม่สามารถแก้ไข workspace ได้");
  }
}

export async function switchWorkspaceAction(workspaceId: string) {
  try {
    const session = await getSession();
    if (!session) return errorResult("กรุณาเข้าสู่ระบบ");
    const membership = await prisma.workspaceMember.findFirst({
      where: { userId: session.userId, workspaceId, status: "ACTIVE" },
    });
    if (!membership) return errorResult("คุณไม่มีสิทธิ์ใน workspace นี้");
    await setCurrentWorkspace(workspaceId);
    revalidatePath("/");
    return successResult({ workspaceId }, "สลับ workspace สำเร็จ");
  } catch {
    return errorResult("ไม่สามารถสลับ workspace ได้");
  }
}

export async function inviteUserToWorkspaceAction(data: unknown) {
  try {
    const { workspaceId } = await requireWorkspaceRole(OWNER_ADMIN);
    const parsed = inviteUserSchema.safeParse(data);
    if (!parsed.success) return errorResult("ข้อมูลผู้ใช้ไม่ถูกต้อง", parsed.error.flatten().fieldErrors);
    const user = await prisma.user.findUnique({ where: { username: parsed.data.username } });
    if (!user) return errorResult("ไม่พบ username นี้ ถ้ายังไม่มีผู้ใช้ให้ไปสร้างที่หน้า ผู้ใช้งาน ก่อน");
    const membership = await prisma.workspaceMember.upsert({
      where: { workspaceId_userId: { workspaceId, userId: user.id } },
      update: { role: parsed.data.role, status: "ACTIVE" },
      create: { workspaceId, userId: user.id, role: parsed.data.role, status: "ACTIVE" },
    });
    revalidatePath("/workspaces");
    return successResult(membership, "เพิ่มผู้ช่วยเข้า workspace สำเร็จ");
  } catch (error) {
    return errorResult(error instanceof Error ? error.message : "ไม่สามารถเพิ่มผู้ช่วยได้");
  }
}

export async function searchUsersForWorkspaceInviteAction(keyword: string) {
  try {
    const { workspaceId } = await requireWorkspaceRole(OWNER_ADMIN);
    const parsed = workspaceUserSearchSchema.safeParse({ keyword });
    if (!parsed.success) return errorResult("กรุณากรอกคำค้นหา", parsed.error.flatten().fieldErrors);
    const users = await prisma.user.findMany({
      where: {
        status: "ACTIVE",
        OR: [
          { username: { contains: parsed.data.keyword, mode: "insensitive" } },
          { fullName: { contains: parsed.data.keyword, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        workspaceMemberships: {
          where: { workspaceId, status: "ACTIVE" },
          select: { id: true, role: true },
        },
        receivedWorkspaceInvites: {
          where: { workspaceId, status: "PENDING" },
          select: { id: true, role: true },
        },
      },
      take: 10,
    });
    return successResult(
      users.map((user) => ({
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        alreadyMember: user.workspaceMemberships.length > 0,
        pendingInvitation: user.receivedWorkspaceInvites[0] ?? null,
      })),
    );
  } catch (error) {
    return errorResult(error instanceof Error ? error.message : "ไม่สามารถค้นหาผู้ใช้ได้");
  }
}

export async function sendWorkspaceInvitationAction(data: unknown) {
  try {
    const { workspaceId, userId, role: actorRole } = await requireWorkspaceRole(OWNER_ADMIN);
    const parsed = sendWorkspaceInvitationSchema.safeParse(data);
    if (!parsed.success) return errorResult("ข้อมูลคำเชิญไม่ถูกต้อง", parsed.error.flatten().fieldErrors);
    if (actorRole === "ADMIN" && parsed.data.role === "OWNER") return errorResult("ผู้ดูแลไม่สามารถเชิญผู้ใช้เป็น OWNER ได้");

    const invitedUser = await prisma.user.findFirst({
      where: { id: parsed.data.userId, status: "ACTIVE" },
      select: { id: true, username: true, fullName: true },
    });
    if (!invitedUser) return errorResult("ไม่พบผู้ใช้ที่ต้องการเชิญ");

    const membership = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: parsed.data.userId, status: "ACTIVE" },
    });
    if (membership) return errorResult("ผู้ใช้นี้อยู่ใน workspace นี้แล้ว");

    const existingInvite = await prisma.workspaceInvitation.findFirst({
      where: { workspaceId, invitedUserId: parsed.data.userId, status: "PENDING" },
    });
    if (existingInvite) return errorResult("ผู้ใช้นี้มีคำเชิญที่รอตอบรับอยู่แล้ว");

    const invitation = await prisma.workspaceInvitation.create({
      data: {
        workspaceId,
        invitedUserId: parsed.data.userId,
        invitedById: userId,
        role: parsed.data.role,
        message: parsed.data.message,
        status: "PENDING",
      },
      include: {
        invitedUser: { select: { username: true, fullName: true } },
      },
    });
    revalidatePath("/workspaces");
    return successResult(invitation, `ส่งคำเชิญให้ ${invitedUser.fullName} แล้ว`);
  } catch (error) {
    return errorResult(error instanceof Error ? error.message : "ไม่สามารถส่งคำเชิญได้");
  }
}

export async function requestJoinWorkspaceAction(data: unknown) {
  try {
    const session = await getSession();
    if (!session) return errorResult("กรุณาเข้าสู่ระบบ");
    const parsed = requestJoinWorkspaceSchema.safeParse(data);
    if (!parsed.success) return errorResult("ข้อมูลคำขอไม่ถูกต้อง", parsed.error.flatten().fieldErrors);

    const workspace = await prisma.workspace.findUnique({ where: { id: parsed.data.workspaceId } });
    if (!workspace) return errorResult("ไม่พบ workspace นี้");

    const membership = await prisma.workspaceMember.findFirst({
      where: { workspaceId: parsed.data.workspaceId, userId: session.userId, status: "ACTIVE" },
    });
    if (membership) return errorResult("คุณอยู่ใน workspace นี้แล้ว");

    const existing = await prisma.workspaceInvitation.findFirst({
      where: { workspaceId: parsed.data.workspaceId, invitedUserId: session.userId, status: "PENDING" },
    });
    if (existing) return errorResult("คุณส่งคำขอหรือมีคำเชิญที่รอตอบรับอยู่แล้ว");

    const request = await prisma.workspaceInvitation.create({
      data: {
        workspaceId: parsed.data.workspaceId,
        invitedUserId: session.userId,
        invitedById: session.userId,
        role: "VIEWER",
        message: parsed.data.message || "คำขอเข้าร่วม workspace จาก QR/ลิงก์",
        status: "PENDING",
      },
    });
    revalidatePath("/workspaces");
    return successResult(request, "ส่งคำขอเข้า workspace แล้ว รอผู้ดูแลอนุมัติ");
  } catch {
    return errorResult("ไม่สามารถส่งคำขอเข้า workspace ได้");
  }
}

export async function getWorkspaceJoinRequestsAction() {
  try {
    const { workspaceId } = await requireWorkspaceRole(OWNER_ADMIN);
    const requests = await prisma.workspaceInvitation.findMany({
      where: { workspaceId, status: "PENDING" },
      include: {
        invitedUser: { select: { id: true, username: true, fullName: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return successResult(requests.filter((request) => request.invitedById === request.invitedUserId));
  } catch (error) {
    return errorResult(error instanceof Error ? error.message : "ไม่สามารถดึงคำขอเข้า workspace ได้");
  }
}

export async function approveJoinRequestAction(data: unknown) {
  try {
    const { workspaceId } = await requireWorkspaceRole(OWNER_ADMIN);
    const parsed = approveJoinRequestSchema.safeParse(data);
    if (!parsed.success) return errorResult("ข้อมูลอนุมัติไม่ถูกต้อง", parsed.error.flatten().fieldErrors);
    const invitation = await prisma.workspaceInvitation.findFirst({
      where: { id: parsed.data.invitationId, workspaceId, status: "PENDING" },
    });
    if (!invitation) return errorResult("ไม่พบคำขอที่รออนุมัติ");

    const membership = await prisma.$transaction(async (tx) => {
      const saved = await tx.workspaceMember.upsert({
        where: { workspaceId_userId: { workspaceId, userId: invitation.invitedUserId } },
        update: { role: parsed.data.role, status: "ACTIVE" },
        create: { workspaceId, userId: invitation.invitedUserId, role: parsed.data.role, status: "ACTIVE" },
      });
      await tx.workspaceInvitation.update({
        where: { id: invitation.id },
        data: { status: "ACCEPTED", role: parsed.data.role, respondedAt: new Date() },
      });
      return saved;
    });
    revalidatePath("/workspaces");
    return successResult(membership, "อนุมัติให้เข้า workspace แล้ว");
  } catch {
    return errorResult("ไม่สามารถอนุมัติคำขอได้");
  }
}

export async function getPendingWorkspaceInvitationsAction() {
  try {
    const session = await getSession();
    if (!session) return errorResult("กรุณาเข้าสู่ระบบ");
    const invitations = await prisma.workspaceInvitation.findMany({
      where: { invitedUserId: session.userId, status: "PENDING" },
      include: {
        workspace: true,
        invitedBy: { select: { fullName: true, username: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return successResult(invitations.filter((invitation) => invitation.invitedById !== invitation.invitedUserId));
  } catch {
    return errorResult("ไม่สามารถดึงคำเชิญได้");
  }
}

export async function getSentWorkspaceInvitationsAction() {
  try {
    const { workspaceId } = await requireWorkspaceRole(OWNER_ADMIN);
    const invitations = await prisma.workspaceInvitation.findMany({
      where: { workspaceId, status: "PENDING" },
      include: {
        invitedUser: { select: { username: true, fullName: true } },
        invitedBy: { select: { username: true, fullName: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return successResult(invitations.filter((invitation) => invitation.invitedById !== invitation.invitedUserId));
  } catch (error) {
    return errorResult(error instanceof Error ? error.message : "ไม่สามารถดึงคำเชิญที่ส่งได้");
  }
}

export async function acceptWorkspaceInvitationAction(invitationId: string) {
  try {
    const session = await getSession();
    if (!session) return errorResult("กรุณาเข้าสู่ระบบ");
    const invitation = await prisma.workspaceInvitation.findFirst({
      where: { id: invitationId, invitedUserId: session.userId, status: "PENDING" },
    });
    if (!invitation) return errorResult("ไม่พบคำเชิญ หรือคำเชิญนี้ถูกใช้งานแล้ว");

    const result = await prisma.$transaction(async (tx) => {
      const membership = await tx.workspaceMember.upsert({
        where: { workspaceId_userId: { workspaceId: invitation.workspaceId, userId: session.userId } },
        update: { role: invitation.role, status: "ACTIVE" },
        create: {
          workspaceId: invitation.workspaceId,
          userId: session.userId,
          role: invitation.role,
          status: "ACTIVE",
        },
      });
      await tx.workspaceInvitation.update({
        where: { id: invitation.id },
        data: { status: "ACCEPTED", respondedAt: new Date() },
      });
      return membership;
    });
    await setCurrentWorkspace(invitation.workspaceId);
    revalidatePath("/");
    return successResult(result, "ตอบรับคำเชิญและสลับ workspace แล้ว");
  } catch {
    return errorResult("ไม่สามารถตอบรับคำเชิญได้");
  }
}

export async function declineWorkspaceInvitationAction(invitationId: string) {
  try {
    const session = await getSession();
    if (!session) return errorResult("กรุณาเข้าสู่ระบบ");
    const invitation = await prisma.workspaceInvitation.findFirst({
      where: { id: invitationId, invitedUserId: session.userId, status: "PENDING" },
    });
    if (!invitation) return errorResult("ไม่พบคำเชิญ หรือคำเชิญนี้ถูกใช้งานแล้ว");
    const updated = await prisma.workspaceInvitation.update({
      where: { id: invitation.id },
      data: { status: "DECLINED", respondedAt: new Date() },
    });
    revalidatePath("/workspaces");
    return successResult(updated, "ปฏิเสธคำเชิญแล้ว");
  } catch {
    return errorResult("ไม่สามารถปฏิเสธคำเชิญได้");
  }
}

async function ensureOwnerCanChange(workspaceId: string, targetUserId: string) {
  const target = await prisma.workspaceMember.findFirst({
    where: { workspaceId, userId: targetUserId, status: "ACTIVE" },
  });
  if (!target) throw new Error("ไม่พบผู้ใช้ใน workspace");
  if (target.role !== "OWNER") return;
  const ownerCount = await prisma.workspaceMember.count({ where: { workspaceId, role: "OWNER", status: "ACTIVE" } });
  if (ownerCount <= 1) throw new Error("ห้ามลดสิทธิ์หรือลบ OWNER คนเดียวของ workspace");
}

export async function updateWorkspaceMemberRoleAction(data: unknown) {
  try {
    const { workspaceId } = await requireWorkspaceRole(OWNER_ONLY);
    const parsed = updateWorkspaceMemberRoleSchema.safeParse(data);
    if (!parsed.success) return errorResult("ข้อมูล role ไม่ถูกต้อง", parsed.error.flatten().fieldErrors);
    if (parsed.data.role !== "OWNER") await ensureOwnerCanChange(workspaceId, parsed.data.userId);
    const updated = await prisma.workspaceMember.update({
      where: { workspaceId_userId: { workspaceId, userId: parsed.data.userId } },
      data: { role: parsed.data.role },
    });
    revalidatePath("/workspaces");
    return successResult(updated, "อัปเดต role สำเร็จ");
  } catch (error) {
    return errorResult(error instanceof Error ? error.message : "ไม่สามารถอัปเดต role ได้");
  }
}

export async function removeWorkspaceMemberAction(data: unknown) {
  try {
    const { workspaceId } = await requireWorkspaceRole(OWNER_ONLY);
    const parsed = removeWorkspaceMemberSchema.safeParse(data);
    if (!parsed.success) return errorResult("ข้อมูลไม่ถูกต้อง", parsed.error.flatten().fieldErrors);
    await ensureOwnerCanChange(workspaceId, parsed.data.userId);
    const updated = await prisma.workspaceMember.update({
      where: { workspaceId_userId: { workspaceId, userId: parsed.data.userId } },
      data: { status: "INACTIVE" },
    });
    revalidatePath("/workspaces");
    return successResult(updated, "ปิดใช้งานผู้ช่วยใน workspace แล้ว");
  } catch (error) {
    return errorResult(error instanceof Error ? error.message : "ไม่สามารถปิดใช้งานผู้ช่วยได้");
  }
}

export async function getWorkspaceMembersAction() {
  try {
    const { workspaceId } = await getCurrentWorkspaceOrThrow();
    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: { user: { select: { id: true, username: true, fullName: true, status: true } } },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    });
    return successResult(members);
  } catch {
    return errorResult("ไม่สามารถดึงผู้ใช้ใน workspace ได้");
  }
}
