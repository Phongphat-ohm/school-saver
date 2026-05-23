"use server";

import { revalidatePath } from "next/cache";
import { logActivity, writeActivityLog } from "@/lib/activity-log";
import { OWNER_ADMIN, requireWorkspaceRole } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { issueEmailVerificationOtp, verifyEmailOtp } from "@/lib/email-verification";
import { getOtpRateLimitSeconds } from "@/lib/platform-settings";
import { errorResult, successResult } from "@/lib/result";
import { destroyRestoreSession, destroySession, getRestoreSession, getSession } from "@/lib/session";
import { hashPassword, verifyPassword } from "@/lib/password";
import { ensureWorkspaceUserLimit } from "@/lib/workspace-limits";
import {
  cancelMyAccountSchema,
  changeMyPasswordSchema,
  createWorkspaceUserSchema,
  restoreCancelledAccountSchema,
  updateMyProfileSchema,
  updateWorkspaceUserRoleSchema,
  verifyEmailOtpSchema,
  verifyRestoreAccountOtpSchema,
} from "@/features/users/schemas";

const ACCOUNT_RESTORE_DAYS = 30;

export async function getWorkspaceUsersAction() {
  try {
    const { workspaceId } = await requireWorkspaceRole(OWNER_ADMIN);
    const users = await prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: { user: { select: { id: true, username: true, email: true, emailVerifiedAt: true, fullName: true, status: true } } },
      orderBy: { createdAt: "asc" },
    });
    return successResult(users);
  } catch (error) {
    return errorResult(error instanceof Error ? error.message : "ไม่สามารถดึงผู้ใช้ได้");
  }
}

export async function createUserAndAddToWorkspaceAction(data: unknown) {
  try {
    await purgeExpiredCancelledUsers();
    const { workspaceId, userId, role: actorRole } = await requireWorkspaceRole(OWNER_ADMIN);
    const parsed = createWorkspaceUserSchema.safeParse(data);
    if (!parsed.success) return errorResult("ข้อมูลผู้ใช้ไม่ถูกต้อง", parsed.error.flatten().fieldErrors);
    if (actorRole === "ADMIN" && parsed.data.role === "OWNER") return errorResult("ผู้ดูแลไม่สามารถสร้างผู้ใช้เป็น OWNER ได้");
    const exists = await prisma.user.findFirst({
      where: {
        OR: [
          { username: parsed.data.username },
          ...(parsed.data.email ? [{ email: parsed.data.email }] : []),
        ],
      },
    });
    if (exists?.username === parsed.data.username) return errorResult("username นี้มีแล้ว");
    if (exists?.email === parsed.data.email) return errorResult("อีเมลนี้มีแล้ว");
    await ensureWorkspaceUserLimit(workspaceId);
    const user = await prisma.$transaction(async (tx) => {
      await ensureWorkspaceUserLimit(workspaceId, 1, tx);
      const created = await tx.user.create({
        data: {
          username: parsed.data.username,
          email: parsed.data.email,
          passwordHash: await hashPassword(parsed.data.password),
          fullName: parsed.data.fullName,
          status: "ACTIVE",
        },
      });
      await tx.workspaceMember.create({
        data: { workspaceId, userId: created.id, role: parsed.data.role, status: "ACTIVE" },
      });
      await writeActivityLog(tx, { workspaceId, userId, action: "CREATE_USER", detail: `สร้างผู้ใช้ ${created.fullName} (${created.username})` });
      return created;
    });
    revalidatePath("/users");
    return successResult(user, "สร้างผู้ใช้และเพิ่มเข้า workspace สำเร็จ");
  } catch {
    return errorResult("ไม่สามารถสร้างผู้ใช้ได้");
  }
}

export async function updateWorkspaceUserRoleAction(data: unknown) {
  try {
    const { workspaceId, userId, role: actorRole } = await requireWorkspaceRole(OWNER_ADMIN);
    const parsed = updateWorkspaceUserRoleSchema.safeParse(data);
    if (!parsed.success) return errorResult("ข้อมูล role ไม่ถูกต้อง", parsed.error.flatten().fieldErrors);
    const target = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: parsed.data.userId, status: "ACTIVE" },
    });
    if (!target) return errorResult("ไม่พบผู้ใช้ใน workspace นี้");
    if (actorRole === "ADMIN" && target.role === "OWNER") return errorResult("ผู้ดูแลไม่สามารถแก้ไขสิทธิ์ของ OWNER ได้");
    if (actorRole === "ADMIN" && parsed.data.role === "OWNER") return errorResult("ผู้ดูแลไม่สามารถมอบสิทธิ์ OWNER ได้");
    if (target.role === "OWNER" && parsed.data.role !== "OWNER") {
      const ownerCount = await prisma.workspaceMember.count({ where: { workspaceId, role: "OWNER", status: "ACTIVE" } });
      if (ownerCount <= 1) return errorResult("ห้ามลดสิทธิ์ OWNER คนเดียวของ workspace");
    }
    const updated = await prisma.workspaceMember.update({
      where: { workspaceId_userId: { workspaceId, userId: parsed.data.userId } },
      data: { role: parsed.data.role },
    });
    await logActivity({ workspaceId, userId, action: "UPDATE_WORKSPACE_MEMBER_ROLE", detail: `เปลี่ยนสิทธิ์ผู้ใช้เป็น ${parsed.data.role}` });
    revalidatePath("/users");
    revalidatePath("/workspaces");
    return successResult(updated, "เปลี่ยน role สำเร็จ");
  } catch {
    return errorResult("ไม่สามารถเปลี่ยน role ได้");
  }
}

export async function disableWorkspaceUserAction(id: string) {
  try {
    const { workspaceId, userId, role: actorRole } = await requireWorkspaceRole(OWNER_ADMIN);
    const membership = await prisma.workspaceMember.findFirst({ where: { id, workspaceId } });
    if (!membership) return errorResult("ไม่พบผู้ใช้ใน workspace นี้");
    if (actorRole === "ADMIN" && membership.role === "OWNER") return errorResult("ผู้ดูแลไม่สามารถปิดใช้งาน OWNER ได้");
    if (membership.role === "OWNER") {
      const ownerCount = await prisma.workspaceMember.count({ where: { workspaceId, role: "OWNER", status: "ACTIVE" } });
      if (ownerCount <= 1) return errorResult("ห้ามปิดใช้งาน OWNER คนเดียวของ workspace");
    }
    const updated = await prisma.workspaceMember.update({ where: { id }, data: { status: "INACTIVE" } });
    await logActivity({ workspaceId, userId, action: "DISABLE_USER", detail: `ปิดใช้งานผู้ใช้ใน workspace` });
    revalidatePath("/users");
    revalidatePath("/workspaces");
    return successResult(updated, "ปิดใช้งานผู้ใช้ใน workspace แล้ว");
  } catch {
    return errorResult("ไม่สามารถปิดใช้งานผู้ใช้ได้");
  }
}

export async function enableWorkspaceUserAction(id: string) {
  try {
    const { workspaceId, userId, role: actorRole } = await requireWorkspaceRole(OWNER_ADMIN);
    const membership = await prisma.workspaceMember.findFirst({
      where: { id, workspaceId },
      include: { user: { select: { id: true, fullName: true, status: true } } },
    });
    if (!membership) return errorResult("ไม่พบผู้ใช้ใน workspace นี้");
    if (membership.status === "ACTIVE") return errorResult("ผู้ใช้นี้เปิดใช้งานอยู่แล้ว");
    if (membership.cancelledAt || membership.user.status !== "ACTIVE") return errorResult("บัญชีผู้ใช้นี้ถูกปิดระดับบัญชี ต้องกู้คืนบัญชีก่อนเปิดใช้งานใน workspace");
    if (actorRole === "ADMIN" && membership.role === "OWNER") return errorResult("ผู้ดูแลไม่สามารถเปิดใช้งาน OWNER ได้");

    const updated = await prisma.$transaction(async (tx) => {
      await tx.workspaceInvitation.deleteMany({
        where: { workspaceId, invitedUserId: membership.userId, status: "PENDING" },
      });
      await ensureWorkspaceUserLimit(workspaceId, 1, tx);
      const saved = await tx.workspaceMember.update({ where: { id }, data: { status: "ACTIVE" } });
      await writeActivityLog(tx, { workspaceId, userId, action: "ENABLE_USER", detail: `เปิดใช้งานผู้ใช้ ${membership.user.fullName} ใน workspace` });
      return saved;
    });

    revalidatePath("/users");
    revalidatePath("/workspaces");
    return successResult(updated, "เปิดใช้งานผู้ใช้ใน workspace แล้ว");
  } catch (error) {
    return errorResult(error instanceof Error ? error.message : "ไม่สามารถเปิดใช้งานผู้ใช้ได้");
  }
}

export async function deleteWorkspaceUserAction(id: string) {
  try {
    const { workspaceId, userId, role: actorRole } = await requireWorkspaceRole(OWNER_ADMIN);
    const membership = await prisma.workspaceMember.findFirst({
      where: { id, workspaceId },
      include: { user: { select: { id: true, fullName: true } } },
    });
    if (!membership) return errorResult("ไม่พบผู้ใช้ใน workspace นี้");
    if (membership.userId === userId) return errorResult("ไม่สามารถลบผู้ใช้ของตัวเองได้");
    if (actorRole === "ADMIN" && membership.role === "OWNER") return errorResult("ผู้ดูแลไม่สามารถลบ OWNER ได้");
    if (membership.role === "OWNER") {
      const ownerCount = await prisma.workspaceMember.count({ where: { workspaceId, role: "OWNER", status: "ACTIVE" } });
      if (ownerCount <= 1) return errorResult("ห้ามลบ OWNER คนเดียวของ workspace");
    }

    const result = await prisma.$transaction(async (tx) => {
      const deletedMembership = await tx.workspaceMember.delete({
        where: { id },
      });
      await tx.workspaceInvitation.deleteMany({
        where: { workspaceId, invitedUserId: membership.userId, status: "PENDING" },
      });
      await writeActivityLog(tx, { workspaceId, userId, action: "DELETE_USER", detail: `ลบผู้ใช้ ${membership.user.fullName} ออกจาก workspace` });

      return deletedMembership;
    });

    revalidatePath("/users");
    revalidatePath("/workspaces");
    revalidatePath("/workspaces/manage");
    return successResult(result, `ลบผู้ใช้ ${membership.user.fullName} ออกจาก workspace แล้ว`);
  } catch {
    return errorResult("ไม่สามารถลบผู้ใช้ได้");
  }
}

export async function updateMyProfileAction(data: unknown) {
  try {
    const session = await getSession();
    if (!session) return errorResult("กรุณาเข้าสู่ระบบ");
    const parsed = updateMyProfileSchema.safeParse(data);
    if (!parsed.success) return errorResult("ข้อมูลโปรไฟล์ไม่ถูกต้อง", parsed.error.flatten().fieldErrors);
    const currentUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { email: true, emailVerifiedAt: true },
    });
    if (!currentUser) {
      await destroySession();
      return errorResult("ไม่พบผู้ใช้ กรุณาเข้าสู่ระบบใหม่");
    }
    if (parsed.data.email) {
      const emailOwner = await prisma.user.findFirst({
        where: { email: parsed.data.email, NOT: { id: session.userId } },
        select: { id: true },
      });
      if (emailOwner) return errorResult("อีเมลนี้มีผู้ใช้งานแล้ว");
    }
    const emailChanged = currentUser.email !== parsed.data.email;
    const user = await prisma.user.update({
      where: { id: session.userId },
      data: {
        fullName: parsed.data.fullName,
        email: parsed.data.email,
        emailVerifiedAt: emailChanged ? null : currentUser.emailVerifiedAt,
      },
      select: { id: true, username: true, email: true, emailVerifiedAt: true, fullName: true },
    });
    if (session.currentWorkspaceId) {
      await logActivity({ workspaceId: session.currentWorkspaceId, userId: session.userId, action: "UPDATE_PROFILE", detail: "แก้ไขข้อมูลโปรไฟล์" });
    }
    revalidatePath("/");
    return successResult(user, "แก้ไขข้อมูลผู้ใช้สำเร็จ");
  } catch {
    return errorResult("ไม่สามารถแก้ไขข้อมูลผู้ใช้ได้");
  }
}

export async function sendMyEmailVerificationOtpAction() {
  try {
    const session = await getSession();
    if (!session) return errorResult("กรุณาเข้าสู่ระบบ");
    const user = await prisma.user.findFirst({
      where: { id: session.userId, status: "ACTIVE" },
      select: { id: true, email: true, emailVerifiedAt: true },
    });
    if (!user) {
      await destroySession();
      return errorResult("ไม่พบผู้ใช้ กรุณาเข้าสู่ระบบใหม่");
    }
    if (!user.email) return errorResult("กรุณาเพิ่มอีเมลก่อนขอรหัส OTP");
    if (user.emailVerifiedAt) return errorResult("อีเมลนี้ยืนยันแล้ว");

    const otpRateLimitSeconds = await getOtpRateLimitSeconds();
    const activeOtp = await prisma.emailVerificationOtp.findFirst({
      where: {
        userId: user.id,
        email: user.email,
        verifiedAt: null,
        expiresAt: { gt: new Date() },
        ...(otpRateLimitSeconds > 0 ? { sentAt: { gt: new Date(Date.now() - otpRateLimitSeconds * 1000) } } : {}),
      },
      orderBy: { sentAt: "desc" },
      select: { sentAt: true },
    });
    if (activeOtp) {
      const retryAfterSeconds = Math.max(1, Math.ceil((activeOtp.sentAt.getTime() + otpRateLimitSeconds * 1000 - Date.now()) / 1000));
      return errorResult("กรุณารอสักครู่ก่อนขอรหัส OTP ใหม่", undefined, { retryAfterSeconds });
    }

    const result = await issueEmailVerificationOtp(user.id, user.email);
    await logActivity({ workspaceId: session.currentWorkspaceId, userId: user.id, action: "SEND_EMAIL_VERIFICATION_OTP", detail: `ส่ง OTP ยืนยันอีเมล ${user.email}` });
    revalidatePath("/settings");
    return successResult({ ...result, retryAfterSeconds: otpRateLimitSeconds }, "ส่งรหัส OTP ไปที่อีเมลแล้ว");
  } catch (error) {
    return errorResult(error instanceof Error ? error.message : "ไม่สามารถส่งรหัส OTP ได้");
  }
}

export async function verifyMyEmailOtpAction(data: unknown) {
  try {
    const session = await getSession();
    if (!session) return errorResult("กรุณาเข้าสู่ระบบ");
    const parsed = verifyEmailOtpSchema.safeParse(data);
    if (!parsed.success) return errorResult("ข้อมูล OTP ไม่ถูกต้อง", parsed.error.flatten().fieldErrors);

    const user = await prisma.user.findFirst({
      where: { id: session.userId, status: "ACTIVE" },
      select: { id: true, email: true, emailVerifiedAt: true },
    });
    if (!user) {
      await destroySession();
      return errorResult("ไม่พบผู้ใช้ กรุณาเข้าสู่ระบบใหม่");
    }
    if (!user.email) return errorResult("กรุณาเพิ่มอีเมลก่อนยืนยัน");
    if (user.emailVerifiedAt) return successResult({ verified: true }, "อีเมลนี้ยืนยันแล้ว");

    const result = await verifyEmailOtp(user.id, user.email, parsed.data.code);
    if (!result.ok) return errorResult(result.message);
    if (session.currentWorkspaceId) {
      await logActivity({ workspaceId: session.currentWorkspaceId, userId: session.userId, action: "VERIFY_EMAIL", detail: `ยืนยันอีเมล ${user.email}` });
    }
    revalidatePath("/settings");
    return successResult({ verified: true, verifiedAt: result.verifiedAt }, "ยืนยันอีเมลสำเร็จ");
  } catch {
    return errorResult("ไม่สามารถยืนยันอีเมลได้");
  }
}

export async function changeMyPasswordAction(data: unknown) {
  try {
    const session = await getSession();
    if (!session) return errorResult("กรุณาเข้าสู่ระบบ");
    const parsed = changeMyPasswordSchema.safeParse(data);
    if (!parsed.success) return errorResult("ข้อมูลรหัสผ่านไม่ถูกต้อง", parsed.error.flatten().fieldErrors);
    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) {
      await destroySession();
      return errorResult("ไม่พบผู้ใช้ กรุณาเข้าสู่ระบบใหม่");
    }
    const validPassword = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
    if (!validPassword) {
      if (session.currentWorkspaceId) {
        await logActivity({ workspaceId: session.currentWorkspaceId, userId: session.userId, action: "CHANGE_PASSWORD_FAILED", detail: "รหัสผ่านเดิมไม่ถูกต้อง", outcome: "FAILURE" });
      }
      return errorResult("รหัสผ่านเดิมไม่ถูกต้อง");
    }
    await prisma.user.update({
      where: { id: session.userId },
      data: { passwordHash: await hashPassword(parsed.data.newPassword) },
    });
    if (session.currentWorkspaceId) {
      await logActivity({ workspaceId: session.currentWorkspaceId, userId: session.userId, action: "CHANGE_PASSWORD", detail: "เปลี่ยนรหัสผ่านบัญชี" });
    }
    return successResult({ changed: true }, "เปลี่ยนรหัสผ่านสำเร็จ");
  } catch {
    return errorResult("ไม่สามารถเปลี่ยนรหัสผ่านได้");
  }
}

export async function cancelMyAccountAction(data: unknown) {
  try {
    const session = await getSession();
    if (!session) return errorResult("กรุณาเข้าสู่ระบบ");
    const parsed = cancelMyAccountSchema.safeParse(data);
    if (!parsed.success) return errorResult("ข้อมูลยืนยันไม่ถูกต้อง", parsed.error.flatten().fieldErrors);

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        workspaceMemberships: {
          where: { status: "ACTIVE" },
          select: { workspaceId: true, role: true, workspace: { select: { name: true } } },
        },
      },
    });
    if (!user || user.status !== "ACTIVE") {
      await destroySession();
      return errorResult("ไม่พบผู้ใช้ กรุณาเข้าสู่ระบบใหม่");
    }

    if (!user.email) {
      return errorResult("บัญชีนี้ยังไม่มีอีเมล กรุณาเพิ่มอีเมลก่อนยกเลิกบัญชี เพราะระบบต้องใช้อีเมลเพื่อส่ง OTP สำหรับกู้คืนบัญชี");
    }

    const validPassword = await verifyPassword(parsed.data.password, user.passwordHash);
    if (!validPassword) return errorResult("รหัสผ่านไม่ถูกต้อง");

    const ownerWorkspaceIds = user.workspaceMemberships.filter((membership) => membership.role === "OWNER").map((membership) => membership.workspaceId);
    if (ownerWorkspaceIds.length > 0) {
      const ownerCounts = await prisma.workspaceMember.groupBy({
        by: ["workspaceId"],
        where: { workspaceId: { in: ownerWorkspaceIds }, role: "OWNER", status: "ACTIVE" },
        _count: { _all: true },
      });
      const soleOwnerWorkspaceIds = ownerCounts.filter((row) => row._count._all <= 1).map((row) => row.workspaceId);
      if (soleOwnerWorkspaceIds.length > 0) {
        const names = user.workspaceMemberships
          .filter((membership) => soleOwnerWorkspaceIds.includes(membership.workspaceId))
          .map((membership) => membership.workspace.name)
          .join(", ");
        return errorResult(`ไม่สามารถยกเลิกบัญชีได้ เพราะคุณเป็น OWNER คนเดียวของ workspace: ${names}`);
      }
    }

    const cancelledAt = new Date();
    const restoreUntil = new Date(cancelledAt.getTime() + ACCOUNT_RESTORE_DAYS * 24 * 60 * 60 * 1000);

    await prisma.$transaction(async (tx) => {
      await tx.workspaceMember.updateMany({
        where: { userId: session.userId, status: "ACTIVE" },
        data: { status: "INACTIVE", cancelledAt },
      });
      await tx.workspaceInvitation.updateMany({
        where: { invitedUserId: session.userId, status: "PENDING" },
        data: { status: "CANCELLED" },
      });
      await tx.workspaceInvitation.updateMany({
        where: { invitedById: session.userId, status: "PENDING" },
        data: { status: "CANCELLED" },
      });
      await tx.user.update({
        where: { id: session.userId },
        data: { status: "INACTIVE", cancelledAt, restoreUntil, anonymizedAt: null },
      });
      await writeActivityLog(tx, {
        workspaceId: session.currentWorkspaceId,
        userId: session.userId,
        action: "CANCEL_ACCOUNT",
        detail: `ยกเลิกบัญชี กู้คืนได้ถึง ${restoreUntil.toISOString()}`,
      });
    });

    await destroySession();
    return successResult({ cancelled: true, restoreUntil }, `ยกเลิกบัญชีสำเร็จ ระบบจะเก็บข้อมูลไว้ ${ACCOUNT_RESTORE_DAYS} วันเพื่อให้กู้คืนได้`);
  } catch {
    return errorResult("ไม่สามารถยกเลิกบัญชีได้");
  }
}

export async function restoreCancelledAccountAction(data: unknown) {
  try {
    const restoreSession = await getRestoreSession();
    if (!restoreSession) return errorResult("กรุณาเข้าสู่ระบบก่อนเพื่อเริ่มขั้นตอนกู้คืนบัญชี", undefined, { redirectTo: "/login" });

    const parsed = restoreCancelledAccountSchema.safeParse(data);
    if (!parsed.success) return errorResult("ข้อมูลกู้คืนบัญชีไม่ถูกต้อง", parsed.error.flatten().fieldErrors);
    const restoreEmail = parsed.data.email;
    if (!restoreEmail) return errorResult("กรุณากรอกอีเมล");

    await purgeExpiredCancelledUsers();

    const user = await prisma.user.findUnique({
      where: { id: restoreSession.userId },
      select: { id: true, username: true, email: true, status: true, restoreUntil: true, anonymizedAt: true },
    });
    if (!user || user.anonymizedAt) return errorResult("ไม่พบบัญชีที่สามารถกู้คืนได้", undefined, { redirectTo: "/login" });
    if (user.status === "ACTIVE") return errorResult("บัญชีนี้ใช้งานอยู่แล้ว กรุณาเข้าสู่ระบบตามปกติ", undefined, { redirectTo: "/login" });
    if (!user.restoreUntil || user.restoreUntil < new Date()) return errorResult("บัญชีนี้เกิน 30 วันแล้ว ไม่สามารถกู้คืนได้", undefined, { redirectTo: "/login" });
    if (parsed.data.username !== user.username || restoreEmail !== user.email) return errorResult("ชื่อผู้ใช้หรืออีเมลไม่ตรงกับบัญชีที่ต้องการกู้คืน");

    const otpRateLimitSeconds = await getOtpRateLimitSeconds();
    const activeOtp = await prisma.emailVerificationOtp.findFirst({
      where: {
        userId: user.id,
        email: restoreEmail,
        verifiedAt: null,
        expiresAt: { gt: new Date() },
        ...(otpRateLimitSeconds > 0 ? { sentAt: { gt: new Date(Date.now() - otpRateLimitSeconds * 1000) } } : {}),
      },
      orderBy: { sentAt: "desc" },
      select: { sentAt: true },
    });
    if (activeOtp) {
      const retryAfterSeconds = Math.max(1, Math.ceil((activeOtp.sentAt.getTime() + otpRateLimitSeconds * 1000 - Date.now()) / 1000));
      return errorResult("กรุณารอสักครู่ก่อนขอรหัส OTP ใหม่", undefined, { retryAfterSeconds });
    }

    await issueEmailVerificationOtp(user.id, restoreEmail);
    await logActivity({ userId: user.id, action: "REQUEST_ACCOUNT_RESTORE", detail: `ส่ง OTP กู้คืนบัญชีไปที่ ${restoreEmail}` });
    return successResult({ sent: true, retryAfterSeconds: otpRateLimitSeconds }, "ส่งรหัส OTP ไปที่อีเมลแล้ว");
  } catch {
    return errorResult("ไม่สามารถส่งรหัสกู้คืนบัญชีได้");
  }
}

export async function verifyRestoreAccountOtpAction(data: unknown) {
  try {
    const restoreSession = await getRestoreSession();
    if (!restoreSession) return errorResult("กรุณาเข้าสู่ระบบก่อนเพื่อเริ่มขั้นตอนกู้คืนบัญชี", undefined, { redirectTo: "/login" });

    const parsed = verifyRestoreAccountOtpSchema.safeParse(data);
    if (!parsed.success) return errorResult("ข้อมูล OTP ไม่ถูกต้อง", parsed.error.flatten().fieldErrors);

    await purgeExpiredCancelledUsers();

    const user = await prisma.user.findUnique({
      where: { id: restoreSession.userId },
      select: { id: true, email: true, status: true, restoreUntil: true, anonymizedAt: true },
    });
    if (!user?.email || user.anonymizedAt) return errorResult("ไม่พบบัญชีที่สามารถกู้คืนได้", undefined, { redirectTo: "/login" });
    if (user.status === "ACTIVE") return errorResult("บัญชีนี้ใช้งานอยู่แล้ว กรุณาเข้าสู่ระบบตามปกติ", undefined, { redirectTo: "/login" });
    if (!user.restoreUntil || user.restoreUntil < new Date()) return errorResult("บัญชีนี้เกิน 30 วันแล้ว ไม่สามารถกู้คืนได้", undefined, { redirectTo: "/login" });

    const otpResult = await verifyEmailOtp(user.id, user.email, parsed.data.code);
    if (!otpResult.ok) return errorResult(otpResult.message);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { status: "ACTIVE", cancelledAt: null, restoreUntil: null, anonymizedAt: null },
      });
      await tx.workspaceMember.updateMany({
        where: { userId: user.id, status: "INACTIVE", cancelledAt: { not: null } },
        data: { status: "ACTIVE", cancelledAt: null },
      });
      await writeActivityLog(tx, { userId: user.id, action: "RESTORE_ACCOUNT", detail: "กู้คืนบัญชีสำเร็จ" });
    });
    await destroyRestoreSession();

    return successResult({ restored: true }, "กู้คืนบัญชีสำเร็จ กรุณาเข้าสู่ระบบอีกครั้ง");
  } catch {
    return errorResult("ไม่สามารถกู้คืนบัญชีได้");
  }
}

export async function purgeExpiredCancelledUsers() {
  const expiredUsers = await prisma.user.findMany({
    where: {
      status: "INACTIVE",
      restoreUntil: { lt: new Date() },
      anonymizedAt: null,
    },
    select: { id: true },
    take: 50,
  });

  if (!expiredUsers.length) return { count: 0 };

  const anonymizedAt = new Date();
  await prisma.$transaction(
    expiredUsers.flatMap((user) => [
      prisma.user.update({
        where: { id: user.id },
        data: {
          username: `deleted-${user.id}`,
          email: null,
          fullName: "Deleted user",
          passwordHash: "deleted",
          anonymizedAt,
        },
      }),
      prisma.activityLog.create({
        data: {
          userId: user.id,
          action: "PURGE_CANCELLED_ACCOUNT",
          detail: "ลบบัญชีที่เกินระยะกู้คืน",
        },
      }),
    ]),
  );

  return { count: expiredUsers.length };
}
