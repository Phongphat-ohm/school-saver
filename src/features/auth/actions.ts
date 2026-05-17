"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { issueEmailVerificationOtp, verifyEmailOtp } from "@/lib/email-verification";
import { getPasswordResetTokenStatus, hashPasswordResetToken, issuePasswordResetLink } from "@/lib/password-reset";
import { createSession, destroySession, getSession } from "@/lib/session";
import { hashPassword, verifyPassword } from "@/lib/password";
import { errorResult, successResult } from "@/lib/result";
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema, verifyEmailOtpSchema } from "@/features/auth/schemas";
import { LEGAL_PRIVACY_VERSION, LEGAL_TERMS_VERSION } from "@/constants/legal";

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

    if (!user || user.status !== "ACTIVE") return errorResult("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
    const validPassword = await verifyPassword(parsed.data.password, user.passwordHash);
    if (!validPassword) return errorResult("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");

    const membership = user.workspaceMemberships[0] ?? null;
    await createSession(user.id, membership?.workspaceId ?? null);

    return successResult({
      user: { id: user.id, username: user.username, email: user.email, emailVerifiedAt: user.emailVerifiedAt, fullName: user.fullName },
      currentWorkspace: membership?.workspace ?? null,
    });
  } catch {
    return errorResult("ไม่สามารถเข้าสู่ระบบได้ กรุณาลองใหม่");
  }
}

export async function registerAction(data: unknown) {
  try {
    const parsed = registerSchema.safeParse(data);
    if (!parsed.success) return errorResult("ข้อมูลสมัครสมาชิกไม่ถูกต้อง", parsed.error.flatten().fieldErrors);
    const exists = await prisma.user.findFirst({
      where: {
        OR: [
          { username: parsed.data.username },
          ...(parsed.data.email ? [{ email: parsed.data.email }] : []),
        ],
      },
    });
    if (exists?.username === parsed.data.username) return errorResult("ชื่อผู้ใช้นี้มีผู้ใช้งานแล้ว");
    if (exists?.email === parsed.data.email) return errorResult("อีเมลนี้มีผู้ใช้งานแล้ว");

    const user = await prisma.user.create({
      data: {
        username: parsed.data.username,
        email: parsed.data.email,
        passwordHash: await hashPassword(parsed.data.password),
        fullName: parsed.data.fullName,
        status: "ACTIVE",
        termsAcceptedAt: new Date(),
        termsVersion: LEGAL_TERMS_VERSION,
        privacyAcceptedAt: new Date(),
        privacyVersion: LEGAL_PRIVACY_VERSION,
      },
    });

    await createSession(user.id, null);
    let message = "สมัครสมาชิกสำเร็จ";
    let emailVerificationOtpSent = false;
    let emailVerificationRetryAfterSeconds = 0;
    if (user.email) {
      try {
        await issueEmailVerificationOtp(user.id, user.email);
        emailVerificationOtpSent = true;
        emailVerificationRetryAfterSeconds = 60;
        message = "สมัครสมาชิกสำเร็จ ส่งรหัส OTP ไปที่อีเมลแล้ว";
      } catch {
        message = "สมัครสมาชิกสำเร็จ แต่ยังส่งรหัส OTP ไม่สำเร็จ กรุณาขอรหัสใหม่อีกครั้ง";
      }
    }

    return successResult(
      {
        user: { id: user.id, username: user.username, email: user.email, emailVerifiedAt: user.emailVerifiedAt, fullName: user.fullName },
        emailVerificationOtpSent,
        emailVerificationRetryAfterSeconds,
        currentWorkspace: null,
      },
      message,
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

export async function requestPasswordResetAction(data: unknown) {
  try {
    const parsed = forgotPasswordSchema.safeParse(data);
    if (!parsed.success) return errorResult("ข้อมูลอีเมลไม่ถูกต้อง", parsed.error.flatten().fieldErrors);

    const user = await prisma.user.findFirst({
      where: { email: parsed.data.email, status: "ACTIVE" },
      select: { id: true, email: true },
    });
    if (user?.email) {
      const resetUrlBase = process.env.APP_URL ?? "http://localhost:3000";
      const resetLink = await issuePasswordResetLink({ userId: user.id, email: user.email, resetUrlBase });
      if (!resetLink.sent) {
        return successResult(
          { sent: false },
          "มีลิงก์เปลี่ยนรหัสผ่านที่ยังใช้งานได้อยู่แล้ว กรุณาตรวจสอบอีเมลเดิม หรือรอให้ลิงก์หมดอายุก่อนขอใหม่",
        );
      }
    }

    return successResult({ sent: true }, "ถ้าอีเมลนี้อยู่ในระบบ เราจะส่งลิงก์เปลี่ยนรหัสผ่านไปให้");
  } catch {
    return errorResult("ไม่สามารถส่งลิงก์เปลี่ยนรหัสผ่านได้");
  }
}

export async function resetPasswordWithTokenAction(data: unknown) {
  try {
    const parsed = resetPasswordSchema.safeParse(data);
    if (!parsed.success) return errorResult("ข้อมูลเปลี่ยนรหัสผ่านไม่ถูกต้อง", parsed.error.flatten().fieldErrors);

    const tokenHash = hashPasswordResetToken(parsed.data.token);
    const tokenStatus = await getPasswordResetTokenStatus(parsed.data.token);
    if (tokenStatus === "used") return errorResult("ลิงก์เปลี่ยนรหัสผ่านนี้ถูกใช้งานแล้ว");
    if (tokenStatus === "expired") return errorResult("ลิงก์เปลี่ยนรหัสผ่านหมดอายุแล้ว กรุณาขอลิงก์ใหม่");
    if (tokenStatus === "invalid") return errorResult("ลิงก์เปลี่ยนรหัสผ่านไม่ถูกต้อง");

    const token = await prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
        user: { status: "ACTIVE" },
      },
      select: { id: true, userId: true },
    });
    if (!token) return errorResult("ลิงก์เปลี่ยนรหัสผ่านหมดอายุหรือถูกใช้งานแล้ว");

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: token.userId },
        data: { passwordHash: await hashPassword(parsed.data.password) },
      });
      await tx.passwordResetToken.update({
        where: { id: token.id },
        data: { usedAt: new Date() },
      });
      await tx.passwordResetToken.updateMany({
        where: { userId: token.userId, usedAt: null },
        data: { usedAt: new Date() },
      });
    });

    return successResult({ reset: true }, "เปลี่ยนรหัสผ่านสำเร็จ");
  } catch {
    return errorResult("ไม่สามารถเปลี่ยนรหัสผ่านได้");
  }
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

export async function sendRegisteredEmailVerificationOtpAction() {
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

    const activeOtp = await prisma.emailVerificationOtp.findFirst({
      where: {
        userId: user.id,
        email: user.email,
        verifiedAt: null,
        expiresAt: { gt: new Date() },
        sentAt: { gt: new Date(Date.now() - 60 * 1000) },
      },
      orderBy: { sentAt: "desc" },
      select: { sentAt: true },
    });
    if (activeOtp) {
      const retryAfterSeconds = Math.max(1, Math.ceil((activeOtp.sentAt.getTime() + 60 * 1000 - Date.now()) / 1000));
      return errorResult("กรุณารอสักครู่ก่อนขอรหัส OTP ใหม่", undefined, { retryAfterSeconds });
    }

    await issueEmailVerificationOtp(user.id, user.email);
    return successResult({ sent: true, retryAfterSeconds: 60 }, "ส่งรหัส OTP ไปที่อีเมลแล้ว");
  } catch (error) {
    return errorResult(error instanceof Error ? error.message : "ไม่สามารถส่งรหัส OTP ได้");
  }
}

export async function verifyRegisteredEmailOtpAction(data: unknown) {
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
    return successResult({ verified: true }, "ยืนยันอีเมลสำเร็จ");
  } catch {
    return errorResult("ไม่สามารถยืนยันอีเมลได้");
  }
}

export async function getCurrentUserAction() {
  try {
    const session = await getSession();
    if (!session) return errorResult("กรุณาเข้าสู่ระบบ");
    const user = await prisma.user.findFirst({
      where: { id: session.userId, status: "ACTIVE" },
      select: { id: true, username: true, email: true, emailVerifiedAt: true, fullName: true, status: true },
    });
    if (!user) {
      await destroySession();
      return errorResult("ไม่พบผู้ใช้ กรุณาเข้าสู่ระบบใหม่");
    }
    return successResult(user);
  } catch {
    return errorResult("ไม่สามารถดึงข้อมูลผู้ใช้ได้");
  }
}

export async function acceptLegalAction() {
  try {
    const session = await getSession();
    if (!session) return errorResult("กรุณาเข้าสู่ระบบ");

    await prisma.user.update({
      where: { id: session.userId },
      data: {
        termsAcceptedAt: new Date(),
        termsVersion: LEGAL_TERMS_VERSION,
        privacyAcceptedAt: new Date(),
        privacyVersion: LEGAL_PRIVACY_VERSION,
      },
    });

    return successResult(null, "บันทึกการยอมรับเงื่อนไขและนโยบายความเป็นส่วนตัวแล้ว");
  } catch {
    return errorResult("ไม่สามารถบันทึกการยอมรับได้ กรุณาลองใหม่");
  }
}
