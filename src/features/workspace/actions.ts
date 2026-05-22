"use server";

import { revalidatePath } from "next/cache";
import { defaultPaymentMethods } from "@/constants/payment-methods";
import { logActivity, writeActivityLog } from "@/lib/activity-log";
import { getDefaultWorkspaceStatus, getWorkspaceLimit } from "@/lib/platform-settings";
import { OWNER_ADMIN, OWNER_ONLY, requireWorkspaceRole } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { errorResult, successResult } from "@/lib/result";
import { clearSupportSessionId, getSession, setCurrentWorkspace } from "@/lib/session";
import { getActiveSupportSession } from "@/lib/support-access";
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

async function ensureWorkspaceUserLimit(workspaceId: string, adding = 1) {
  const [activeUsers, maxUsers] = await Promise.all([
    prisma.workspaceMember.count({ where: { workspaceId, status: "ACTIVE" } }),
    getWorkspaceLimit(workspaceId, "max_workspace_users", 30),
  ]);
  if (activeUsers + adding > maxUsers) {
    throw new Error(`workspace นี้มีผู้ใช้ครบตาม limit แล้ว (${activeUsers}/${maxUsers} คน)`);
  }
}

export async function getMyWorkspacesAction() {
  try {
    const session = await getSession();
    if (!session) return errorResult("กรุณาเข้าสู่ระบบ");
    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: session.userId, status: "ACTIVE" },
      include: { workspace: true },
      orderBy: { createdAt: "asc" },
    });
    const workspaces = memberships.map((item) => ({ ...item.workspace, role: item.role }));
    const supportSession = await getActiveSupportSession();
    if (supportSession && !workspaces.some((workspace) => workspace.id === supportSession.workspaceId)) {
      workspaces.push({ ...supportSession.workspace, role: supportSession.mode === "FULL_SUPPORT" ? "ADMIN" : "VIEWER" });
    }
    return successResult(workspaces);
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

export async function getWorkspaceByIdForJoinAction(workspaceId: string) {
  try {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true, name: true, description: true, status: true },
    });
    if (!workspace) return errorResult("ไม่พบ workspace นี้");
    if (workspace.status !== "ACTIVE") return errorResult("workspace นี้ถูกปิดใช้งาน");
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

    const defaultStatus = await getDefaultWorkspaceStatus();
    const workspace = await prisma.$transaction(async (tx) => {
      const created = await tx.workspace.create({
        data: {
          name: parsed.data.name,
          description: parsed.data.description,
          status: defaultStatus,
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
      await writeActivityLog(tx, { workspaceId: created.id, userId: session.userId, action: "CREATE_WORKSPACE", detail: `สร้าง workspace ${created.name}` });
      return created;
    });

    if (workspace.status === "ACTIVE") await setCurrentWorkspace(workspace.id);
    revalidatePath("/");
    return successResult(workspace, workspace.status === "ACTIVE" ? "สร้าง workspace และสลับมาใช้งานแล้ว" : "สร้าง workspace แล้ว แต่ยังไม่เปิดใช้งาน");
  } catch {
    return errorResult("ไม่สามารถสร้าง workspace ได้");
  }
}

export async function updateCurrentWorkspaceAction(data: unknown) {
  try {
    const { workspaceId, userId } = await requireWorkspaceRole(OWNER_ADMIN);
    const parsed = workspaceSchema.safeParse(data);
    if (!parsed.success) return errorResult("ข้อมูล workspace ไม่ถูกต้อง", parsed.error.flatten().fieldErrors);
    const workspace = await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        name: parsed.data.name,
        description: parsed.data.description,
      },
    });
    await logActivity({ workspaceId, userId, action: "UPDATE_WORKSPACE", detail: `แก้ไข workspace ${workspace.name}` });
    revalidatePath("/");
    return successResult(workspace, "แก้ไข workspace สำเร็จ");
  } catch (error) {
    return errorResult(error instanceof Error ? error.message : "ไม่สามารถแก้ไข workspace ได้");
  }
}

export async function deleteCurrentWorkspaceAction() {
  try {
    const { workspaceId, userId } = await requireWorkspaceRole(OWNER_ONLY);
    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { name: true } });

    await prisma.$transaction(async (tx) => {
      await tx.paymentTransaction.deleteMany({ where: { workspaceId } });
      await tx.activityLog.deleteMany({ where: { workspaceId } });
      await tx.workspaceInvitation.deleteMany({ where: { workspaceId } });
      await tx.memberRound.deleteMany({ where: { workspaceId } });
      await tx.collectionRound.deleteMany({ where: { workspaceId } });
      await tx.paymentMethod.deleteMany({ where: { workspaceId } });
      await tx.member.deleteMany({ where: { workspaceId } });
      await tx.workspaceMember.deleteMany({ where: { workspaceId } });
      await tx.workspace.delete({ where: { id: workspaceId } });
      await writeActivityLog(tx, {
        userId,
        action: "DELETE_WORKSPACE",
        detail: `ลบ workspace ${workspace?.name ?? workspaceId}`,
      });
    });

    const nextWorkspace = await prisma.workspaceMember.findFirst({
      where: { userId, status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
      select: { workspaceId: true },
    });
    await setCurrentWorkspace(nextWorkspace?.workspaceId ?? null);

    revalidatePath("/");
    revalidatePath("/workspaces");
    revalidatePath("/settings");
    return successResult({ nextWorkspaceId: nextWorkspace?.workspaceId ?? null }, "ลบ workspace แล้ว");
  } catch (error) {
    return errorResult(error instanceof Error ? error.message : "ไม่สามารถลบ workspace ได้");
  }
}

export async function switchWorkspaceAction(workspaceId: string) {
  try {
    const session = await getSession();
    if (!session) return errorResult("กรุณาเข้าสู่ระบบ");
    const membership = await prisma.workspaceMember.findFirst({
      where: { userId: session.userId, workspaceId, status: "ACTIVE" },
      include: { workspace: { select: { status: true } } },
    });
    if (!membership) return errorResult("คุณไม่มีสิทธิ์ใน workspace นี้");
    if (membership.workspace.status !== "ACTIVE") return errorResult("workspace นี้ถูกปิดใช้งาน");
    await clearSupportSessionId();
    await setCurrentWorkspace(workspaceId);
    await logActivity({ workspaceId, userId: session.userId, action: "SWITCH_WORKSPACE", detail: "สลับ workspace" });
    revalidatePath("/");
    return successResult({ workspaceId }, "สลับ workspace สำเร็จ");
  } catch {
    return errorResult("ไม่สามารถสลับ workspace ได้");
  }
}

export async function inviteUserToWorkspaceAction(data: unknown) {
  try {
    const { workspaceId, userId } = await requireWorkspaceRole(OWNER_ADMIN);
    const parsed = inviteUserSchema.safeParse(data);
    if (!parsed.success) return errorResult("ข้อมูลผู้ใช้ไม่ถูกต้อง", parsed.error.flatten().fieldErrors);
    const user = await prisma.user.findUnique({ where: { username: parsed.data.username } });
    if (!user) return errorResult("ไม่พบ username นี้ ถ้ายังไม่มีผู้ใช้ให้ไปสร้างที่หน้า ผู้ใช้งาน ก่อน");
    const existingMembership = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: user.id, status: "ACTIVE" },
      select: { id: true },
    });
    if (!existingMembership) await ensureWorkspaceUserLimit(workspaceId);
    const membership = await prisma.workspaceMember.upsert({
      where: { workspaceId_userId: { workspaceId, userId: user.id } },
      update: { role: parsed.data.role, status: "ACTIVE" },
      create: { workspaceId, userId: user.id, role: parsed.data.role, status: "ACTIVE" },
    });
    await logActivity({ workspaceId, userId, action: "INVITE_WORKSPACE_USER", detail: `เพิ่ม ${user.fullName} เข้า workspace เป็น ${parsed.data.role}` });
    revalidatePath("/workspaces");
    return successResult(membership, "เพิ่มผู้ช่วยเข้า workspace สำเร็จ");
  } catch (error) {
    return errorResult(error instanceof Error ? error.message : "ไม่สามารถเพิ่มผู้ช่วยได้");
  }
}

export async function searchUsersForWorkspaceInviteAction(keyword: string) {
  try {
    const { workspaceId, userId } = await requireWorkspaceRole(OWNER_ADMIN);
    const parsed = workspaceUserSearchSchema.safeParse({ keyword });
    if (!parsed.success) return errorResult("กรุณากรอกคำค้นหา", parsed.error.flatten().fieldErrors);
    const users = await prisma.user.findMany({
      where: {
        status: "ACTIVE",
        OR: [
          { username: { contains: parsed.data.keyword, mode: "insensitive" } },
          { email: { contains: parsed.data.keyword, mode: "insensitive" } },
          { fullName: { contains: parsed.data.keyword, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        username: true,
        email: true,
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
        email: user.email,
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

    const invitation = await prisma.$transaction(async (tx) => {
      const created = await tx.workspaceInvitation.create({
        data: {
          workspaceId,
          invitedUserId: parsed.data.userId,
          invitedById: userId,
          role: parsed.data.role,
          message: parsed.data.message,
          status: "PENDING",
        },
        include: {
          workspace: { select: { name: true } },
          invitedBy: { select: { fullName: true } },
          invitedUser: { select: { username: true, fullName: true } },
        },
      });
      await tx.notification.create({
        data: {
          userId: parsed.data.userId,
          workspaceId,
          type: "INVITATION",
          title: "มีคำเชิญเข้า Workspace",
          message: `${created.invitedBy.fullName} เชิญคุณเข้า ${created.workspace.name} ในสิทธิ์ ${created.role}`,
          linkUrl: "/workspaces",
        },
      });
      return created;
    });
    await logActivity({ workspaceId, userId, action: "INVITE_WORKSPACE_USER", detail: `ส่งคำเชิญให้ ${invitedUser.fullName} เป็น ${parsed.data.role}` });
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
    if (workspace.status !== "ACTIVE") return errorResult("workspace นี้ถูกปิดใช้งาน");

    const membership = await prisma.workspaceMember.findFirst({
      where: { workspaceId: parsed.data.workspaceId, userId: session.userId, status: "ACTIVE" },
    });
    if (membership) return errorResult("คุณอยู่ใน workspace นี้แล้ว");

    const existing = await prisma.workspaceInvitation.findFirst({
      where: { workspaceId: parsed.data.workspaceId, invitedUserId: session.userId, status: "PENDING" },
    });
    if (existing) return errorResult("คุณส่งคำขอหรือมีคำเชิญที่รอตอบรับอยู่แล้ว");

    const request = await prisma.$transaction(async (tx) => {
      const created = await tx.workspaceInvitation.create({
        data: {
          workspaceId: parsed.data.workspaceId,
          invitedUserId: session.userId,
          invitedById: session.userId,
          role: "VIEWER",
          message: parsed.data.message || "คำขอเข้าร่วม workspace จาก QR/ลิงก์",
          status: "PENDING",
        },
      });
      const requester = await tx.user.findUnique({
        where: { id: session.userId },
        select: { fullName: true },
      });
      const admins = await tx.workspaceMember.findMany({
        where: { workspaceId: parsed.data.workspaceId, status: "ACTIVE", role: { in: ["OWNER", "ADMIN"] }, userId: { not: session.userId } },
        select: { userId: true },
      });
      if (admins.length > 0) {
        await tx.notification.createMany({
          data: admins.map((admin) => ({
            userId: admin.userId,
            workspaceId: parsed.data.workspaceId,
            type: "JOIN_REQUEST" as const,
            title: "มีคำขอเข้า Workspace",
            message: `${requester?.fullName ?? "ผู้ใช้"} ขอเข้าร่วม ${workspace.name}`,
            linkUrl: "/workspaces/manage",
          })),
        });
      }
      return created;
    });
    await logActivity({ workspaceId: parsed.data.workspaceId, userId: session.userId, action: "REQUEST_JOIN_WORKSPACE", detail: `ขอเข้า workspace ${workspace.name}` });
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
    const { workspaceId, userId } = await requireWorkspaceRole(OWNER_ADMIN);
    const parsed = approveJoinRequestSchema.safeParse(data);
    if (!parsed.success) return errorResult("ข้อมูลอนุมัติไม่ถูกต้อง", parsed.error.flatten().fieldErrors);
    const invitation = await prisma.workspaceInvitation.findFirst({
      where: { id: parsed.data.invitationId, workspaceId, status: "PENDING" },
    });
    if (!invitation) return errorResult("ไม่พบคำขอที่รออนุมัติ");
    const existingMembership = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: invitation.invitedUserId, status: "ACTIVE" },
      select: { id: true },
    });
    if (!existingMembership) await ensureWorkspaceUserLimit(workspaceId);

    const membership = await prisma.$transaction(async (tx) => {
      const saved = await tx.workspaceMember.upsert({
        where: { workspaceId_userId: { workspaceId, userId: invitation.invitedUserId } },
        update: { role: parsed.data.role, status: "ACTIVE" },
        create: { workspaceId, userId: invitation.invitedUserId, role: parsed.data.role, status: "ACTIVE" },
      });
      await tx.workspaceInvitation.deleteMany({
        where: {
          workspaceId,
          invitedUserId: invitation.invitedUserId,
          NOT: { id: invitation.id },
        },
      });
      await tx.workspaceInvitation.update({
        where: { id: invitation.id },
        data: { status: "ACCEPTED", role: parsed.data.role, respondedAt: new Date() },
      });
      const workspace = await tx.workspace.findUnique({
        where: { id: workspaceId },
        select: { name: true },
      });
      await tx.notification.create({
        data: {
          userId: invitation.invitedUserId,
          workspaceId,
          type: "WORKSPACE",
          title: "คำขอเข้า Workspace ได้รับอนุมัติ",
          message: `คุณได้รับสิทธิ์ ${parsed.data.role} ใน ${workspace?.name ?? "workspace"}`,
          linkUrl: "/workspaces",
        },
      });
      await writeActivityLog(tx, { workspaceId, userId, action: "APPROVE_JOIN_REQUEST", detail: `อนุมัติผู้ใช้เข้า workspace เป็น ${parsed.data.role}` });
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
    const workspace = await prisma.workspace.findUnique({
      where: { id: invitation.workspaceId },
      select: { status: true },
    });
    if (workspace?.status !== "ACTIVE") return errorResult("workspace นี้ถูกปิดใช้งาน");
    const existingMembership = await prisma.workspaceMember.findFirst({
      where: { workspaceId: invitation.workspaceId, userId: session.userId, status: "ACTIVE" },
      select: { id: true },
    });
    if (!existingMembership) await ensureWorkspaceUserLimit(invitation.workspaceId);

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
      await tx.workspaceInvitation.deleteMany({
        where: {
          workspaceId: invitation.workspaceId,
          invitedUserId: session.userId,
          NOT: { id: invitation.id },
        },
      });
      await tx.workspaceInvitation.update({
        where: { id: invitation.id },
        data: { status: "ACCEPTED", respondedAt: new Date() },
      });
      const [workspace, acceptedUser] = await Promise.all([
        tx.workspace.findUnique({ where: { id: invitation.workspaceId }, select: { name: true } }),
        tx.user.findUnique({ where: { id: session.userId }, select: { fullName: true } }),
      ]);
      await tx.notification.create({
        data: {
          userId: invitation.invitedById,
          workspaceId: invitation.workspaceId,
          type: "INVITATION",
          title: "คำเชิญถูกตอบรับแล้ว",
          message: `${acceptedUser?.fullName ?? "ผู้ใช้"} ตอบรับคำเชิญเข้า ${workspace?.name ?? "workspace"}`,
          linkUrl: "/workspaces/manage",
        },
      });
      await writeActivityLog(tx, { workspaceId: invitation.workspaceId, userId: session.userId, action: "ACCEPT_WORKSPACE_INVITATION", detail: "ตอบรับคำเชิญเข้า workspace" });
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
    const updated = await prisma.$transaction(async (tx) => {
      const saved = await tx.workspaceInvitation.update({
        where: { id: invitation.id },
        data: { status: "DECLINED", respondedAt: new Date() },
      });
      const [workspace, declinedUser] = await Promise.all([
        tx.workspace.findUnique({ where: { id: invitation.workspaceId }, select: { name: true } }),
        tx.user.findUnique({ where: { id: session.userId }, select: { fullName: true } }),
      ]);
      await tx.notification.create({
        data: {
          userId: invitation.invitedById,
          workspaceId: invitation.workspaceId,
          type: "INVITATION",
          title: "คำเชิญถูกปฏิเสธ",
          message: `${declinedUser?.fullName ?? "ผู้ใช้"} ปฏิเสธคำเชิญเข้า ${workspace?.name ?? "workspace"}`,
          linkUrl: "/workspaces/manage",
        },
      });
      return saved;
    });
    await logActivity({ workspaceId: invitation.workspaceId, userId: session.userId, action: "DECLINE_WORKSPACE_INVITATION", detail: "ปฏิเสธคำเชิญเข้า workspace" });
    revalidatePath("/");
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
    const { workspaceId, userId } = await requireWorkspaceRole(OWNER_ONLY);
    const parsed = updateWorkspaceMemberRoleSchema.safeParse(data);
    if (!parsed.success) return errorResult("ข้อมูล role ไม่ถูกต้อง", parsed.error.flatten().fieldErrors);
    if (parsed.data.role !== "OWNER") await ensureOwnerCanChange(workspaceId, parsed.data.userId);
    const updated = await prisma.workspaceMember.update({
      where: { workspaceId_userId: { workspaceId, userId: parsed.data.userId } },
      data: { role: parsed.data.role },
    });
    await logActivity({ workspaceId, userId, action: "UPDATE_WORKSPACE_MEMBER_ROLE", detail: `เปลี่ยนสิทธิ์ผู้ใช้เป็น ${parsed.data.role}` });
    revalidatePath("/workspaces");
    return successResult(updated, "อัปเดต role สำเร็จ");
  } catch (error) {
    return errorResult(error instanceof Error ? error.message : "ไม่สามารถอัปเดต role ได้");
  }
}

export async function removeWorkspaceMemberAction(data: unknown) {
  try {
    const { workspaceId, userId, role: actorRole } = await requireWorkspaceRole(OWNER_ADMIN);
    const parsed = removeWorkspaceMemberSchema.safeParse(data);
    if (!parsed.success) return errorResult("ข้อมูลไม่ถูกต้อง", parsed.error.flatten().fieldErrors);
    if (parsed.data.userId === userId) return errorResult("ไม่สามารถลบตัวเองออกจาก workspace ได้");

    const target = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: parsed.data.userId, status: "ACTIVE" },
    });
    if (!target) return errorResult("ไม่พบผู้ใช้ใน workspace นี้");
    if (actorRole === "ADMIN" && target.role === "OWNER") return errorResult("ADMIN ไม่สามารถลบ OWNER ออกจาก workspace ได้");

    await ensureOwnerCanChange(workspaceId, parsed.data.userId);
    const updated = await prisma.workspaceMember.update({
      where: { workspaceId_userId: { workspaceId, userId: parsed.data.userId } },
      data: { status: "INACTIVE" },
    });
    await logActivity({ workspaceId, userId, action: "REMOVE_WORKSPACE_MEMBER", detail: "นำผู้ใช้ออกจาก workspace" });
    revalidatePath("/workspaces");
    revalidatePath("/users");
    return successResult(updated, "ลบผู้ใช้ออกจาก workspace แล้ว");
  } catch (error) {
    return errorResult(error instanceof Error ? error.message : "ไม่สามารถลบผู้ใช้ออกจาก workspace ได้");
  }
}

export async function getWorkspaceMembersAction() {
  try {
    const { workspaceId } = await getCurrentWorkspaceOrThrow();
    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId, status: "ACTIVE" },
      include: { user: { select: { id: true, username: true, email: true, fullName: true, status: true } } },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    });
    return successResult(members);
  } catch {
    return errorResult("ไม่สามารถดึงผู้ใช้ใน workspace ได้");
  }
}
