"use server";

import { revalidatePath } from "next/cache";
import { OWNER_ADMIN, requireWorkspaceRole } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { errorResult, successResult } from "@/lib/result";
import { getSession } from "@/lib/session";
import { hashPassword, verifyPassword } from "@/lib/password";
import {
  changeMyPasswordSchema,
  createWorkspaceUserSchema,
  updateMyProfileSchema,
  updateWorkspaceUserRoleSchema,
} from "@/features/users/schemas";

export async function getWorkspaceUsersAction() {
  try {
    const { workspaceId } = await requireWorkspaceRole(OWNER_ADMIN);
    const users = await prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: { user: { select: { id: true, username: true, fullName: true, status: true } } },
      orderBy: { createdAt: "asc" },
    });
    return successResult(users);
  } catch (error) {
    return errorResult(error instanceof Error ? error.message : "ไม่สามารถดึงผู้ใช้ได้");
  }
}

export async function createUserAndAddToWorkspaceAction(data: unknown) {
  try {
    const { workspaceId, role: actorRole } = await requireWorkspaceRole(OWNER_ADMIN);
    const parsed = createWorkspaceUserSchema.safeParse(data);
    if (!parsed.success) return errorResult("ข้อมูลผู้ใช้ไม่ถูกต้อง", parsed.error.flatten().fieldErrors);
    if (actorRole === "ADMIN" && parsed.data.role === "OWNER") return errorResult("ผู้ดูแลไม่สามารถสร้างผู้ใช้เป็น OWNER ได้");
    const exists = await prisma.user.findUnique({ where: { username: parsed.data.username } });
    if (exists) return errorResult("username นี้มีแล้ว");
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          username: parsed.data.username,
          passwordHash: await hashPassword(parsed.data.password),
          fullName: parsed.data.fullName,
          status: "ACTIVE",
        },
      });
      await tx.workspaceMember.create({
        data: { workspaceId, userId: created.id, role: parsed.data.role, status: "ACTIVE" },
      });
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
    const { workspaceId, role: actorRole } = await requireWorkspaceRole(OWNER_ADMIN);
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
    revalidatePath("/users");
    revalidatePath("/workspaces");
    return successResult(updated, "เปลี่ยน role สำเร็จ");
  } catch {
    return errorResult("ไม่สามารถเปลี่ยน role ได้");
  }
}

export async function disableWorkspaceUserAction(id: string) {
  try {
    const { workspaceId, role: actorRole } = await requireWorkspaceRole(OWNER_ADMIN);
    const membership = await prisma.workspaceMember.findFirst({ where: { id, workspaceId } });
    if (!membership) return errorResult("ไม่พบผู้ใช้ใน workspace นี้");
    if (actorRole === "ADMIN" && membership.role === "OWNER") return errorResult("ผู้ดูแลไม่สามารถปิดใช้งาน OWNER ได้");
    if (membership.role === "OWNER") {
      const ownerCount = await prisma.workspaceMember.count({ where: { workspaceId, role: "OWNER", status: "ACTIVE" } });
      if (ownerCount <= 1) return errorResult("ห้ามปิดใช้งาน OWNER คนเดียวของ workspace");
    }
    const updated = await prisma.workspaceMember.update({ where: { id }, data: { status: "INACTIVE" } });
    revalidatePath("/users");
    revalidatePath("/workspaces");
    return successResult(updated, "ปิดใช้งานผู้ใช้ใน workspace แล้ว");
  } catch {
    return errorResult("ไม่สามารถปิดใช้งานผู้ใช้ได้");
  }
}

export async function updateMyProfileAction(data: unknown) {
  try {
    const session = await getSession();
    if (!session) return errorResult("กรุณาเข้าสู่ระบบ");
    const parsed = updateMyProfileSchema.safeParse(data);
    if (!parsed.success) return errorResult("ข้อมูลโปรไฟล์ไม่ถูกต้อง", parsed.error.flatten().fieldErrors);
    const user = await prisma.user.update({
      where: { id: session.userId },
      data: { fullName: parsed.data.fullName },
      select: { id: true, username: true, fullName: true },
    });
    revalidatePath("/");
    return successResult(user, "แก้ไขข้อมูลผู้ใช้สำเร็จ");
  } catch {
    return errorResult("ไม่สามารถแก้ไขข้อมูลผู้ใช้ได้");
  }
}

export async function changeMyPasswordAction(data: unknown) {
  try {
    const session = await getSession();
    if (!session) return errorResult("กรุณาเข้าสู่ระบบ");
    const parsed = changeMyPasswordSchema.safeParse(data);
    if (!parsed.success) return errorResult("ข้อมูลรหัสผ่านไม่ถูกต้อง", parsed.error.flatten().fieldErrors);
    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) return errorResult("ไม่พบผู้ใช้");
    const validPassword = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
    if (!validPassword) return errorResult("รหัสผ่านเดิมไม่ถูกต้อง");
    await prisma.user.update({
      where: { id: session.userId },
      data: { passwordHash: await hashPassword(parsed.data.newPassword) },
    });
    return successResult({ changed: true }, "เปลี่ยนรหัสผ่านสำเร็จ");
  } catch {
    return errorResult("ไม่สามารถเปลี่ยนรหัสผ่านได้");
  }
}
