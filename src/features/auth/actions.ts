"use server";

import { redirect } from "next/navigation";
import { defaultPaymentMethods } from "@/constants/payment-methods";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession, getSession } from "@/lib/session";
import { hashPassword, verifyPassword } from "@/lib/password";
import { errorResult, successResult } from "@/lib/result";
import { loginSchema, registerSchema } from "@/features/auth/schemas";

export async function loginAction(username: string, password: string) {
  try {
    const parsed = loginSchema.safeParse({ username, password });
    if (!parsed.success) return errorResult("ข้อมูลเข้าสู่ระบบไม่ถูกต้อง", parsed.error.flatten().fieldErrors);

    const user = await prisma.user.findUnique({
      where: { username: parsed.data.username },
      include: {
        workspaceMemberships: {
          where: { status: "ACTIVE" },
          include: { workspace: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!user || user.status !== "ACTIVE") return errorResult("username หรือ password ไม่ถูกต้อง");
    const validPassword = await verifyPassword(parsed.data.password, user.passwordHash);
    if (!validPassword) return errorResult("username หรือ password ไม่ถูกต้อง");

    const membership = user.workspaceMemberships[0];
    if (!membership) return errorResult("ผู้ใช้นี้ยังไม่มี workspace ที่ใช้งานได้");
    await createSession(user.id, membership.workspaceId);

    return successResult({
      user: { id: user.id, username: user.username, fullName: user.fullName },
      currentWorkspace: membership.workspace,
    });
  } catch {
    return errorResult("ไม่สามารถเข้าสู่ระบบได้ กรุณาลองใหม่");
  }
}

export async function registerAction(data: unknown) {
  try {
    const parsed = registerSchema.safeParse(data);
    if (!parsed.success) return errorResult("ข้อมูลสมัครสมาชิกไม่ถูกต้อง", parsed.error.flatten().fieldErrors);
    const exists = await prisma.user.findUnique({ where: { username: parsed.data.username } });
    if (exists) return errorResult("username นี้มีผู้ใช้งานแล้ว");

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username: parsed.data.username,
          passwordHash: await hashPassword(parsed.data.password),
          fullName: parsed.data.fullName,
          status: "ACTIVE",
        },
      });
      const workspace = await tx.workspace.create({
        data: {
          name: parsed.data.workspaceName,
          description: parsed.data.workspaceDescription,
          ownerId: user.id,
        },
      });
      await tx.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId: user.id,
          role: "OWNER",
          status: "ACTIVE",
        },
      });
      await tx.paymentMethod.createMany({
        data: defaultPaymentMethods.map((method) => ({
          workspaceId: workspace.id,
          name: method.name,
          type: method.type,
          status: "ACTIVE" as const,
        })),
      });
      return { user, workspace };
    });

    await createSession(result.user.id, result.workspace.id);
    return successResult(
      {
        user: { id: result.user.id, username: result.user.username, fullName: result.user.fullName },
        currentWorkspace: result.workspace,
      },
      "สมัครสมาชิกสำเร็จ",
    );
  } catch {
    return errorResult("ไม่สามารถสมัครสมาชิกได้");
  }
}

export async function loginFormAction(formData: FormData) {
  const result = await loginAction(String(formData.get("username") ?? ""), String(formData.get("password") ?? ""));
  if (result.success) redirect("/dashboard");
  return result;
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

export async function getCurrentUserAction() {
  try {
    const session = await getSession();
    if (!session) return errorResult("กรุณาเข้าสู่ระบบ");
    const user = await prisma.user.findFirst({
      where: { id: session.userId, status: "ACTIVE" },
      select: { id: true, username: true, fullName: true, status: true },
    });
    if (!user) return errorResult("ไม่พบผู้ใช้");
    return successResult(user);
  } catch {
    return errorResult("ไม่สามารถดึงข้อมูลผู้ใช้ได้");
  }
}
