import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendEmailWithResend } from "@/lib/email-verification";

const RESET_EXPIRES_IN_MINUTES = 30;

export type PasswordResetTokenStatus = "valid" | "used" | "expired" | "invalid";

export function hashPasswordResetToken(token: string) {
  const secret = process.env.SESSION_SECRET ?? "school-saver-dev-secret";
  return createHash("sha256").update(`${token}:${secret}`).digest("hex");
}

function generatePasswordResetToken() {
  return randomBytes(32).toString("base64url");
}

export async function issuePasswordResetLink(input: { userId: string; email: string; resetUrlBase: string }) {
  const activeToken = await prisma.passwordResetToken.findFirst({
    where: {
      userId: input.userId,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { sentAt: "desc" },
    select: { expiresAt: true },
  });
  if (activeToken) {
    return { expiresAt: activeToken.expiresAt, sent: false };
  }

  const token = generatePasswordResetToken();
  const tokenHash = hashPasswordResetToken(token);
  const expiresAt = new Date(Date.now() + RESET_EXPIRES_IN_MINUTES * 60 * 1000);
  const resetUrl = `${input.resetUrlBase.replace(/\/$/, "")}/reset-password/${token}`;

  await prisma.$transaction(async (tx) => {
    await tx.passwordResetToken.updateMany({
      where: { userId: input.userId, usedAt: null },
      data: { usedAt: new Date() },
    });
    await tx.passwordResetToken.create({
      data: {
        userId: input.userId,
        tokenHash,
        expiresAt,
      },
    });
  });

  await sendEmailWithResend({
    to: input.email,
    subject: "ลิงก์เปลี่ยนรหัสผ่าน SchoolSaver",
    text: `กดลิงก์นี้เพื่อเปลี่ยนรหัสผ่าน: ${resetUrl}\nลิงก์นี้ใช้ได้ ${RESET_EXPIRES_IN_MINUTES} นาที`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>เปลี่ยนรหัสผ่าน SchoolSaver</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed; background-color: #f8fafc; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); overflow: hidden;">
                <tr>
                  <td align="center" style="padding: 40px 40px 20px 40px;">
                    <img src="https://schf.ppkxb.space/images/school-saver-logo.png" alt="SchoolSaver" width="200" style="display: block; max-width: 100%; height: auto;">
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding: 0 40px 24px 40px;">
                    <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 24px; font-weight: 700;">เปลี่ยนรหัสผ่านของคุณ</h2>
                    <p style="margin: 0; color: #475569; font-size: 16px; line-height: 1.5;">
                      เราได้รับคำขอเปลี่ยนรหัสผ่านบัญชี SchoolSaver ของคุณ กดปุ่มด้านล่างเพื่อตั้งรหัสผ่านใหม่
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding: 10px 40px 30px 40px;">
                    <a href="${resetUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 10px; padding: 14px 24px; font-size: 16px; font-weight: 700;">
                      เปลี่ยนรหัสผ่าน
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding: 0 40px 24px 40px;">
                    <p style="margin: 0; color: #ef4444; font-size: 14px; font-weight: 500;">
                      ลิงก์นี้ใช้ได้ ${RESET_EXPIRES_IN_MINUTES} นาที และใช้ได้เพียงครั้งเดียว
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 40px 40px 40px;">
                    <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.6; word-break: break-all;">
                      ถ้าปุ่มใช้งานไม่ได้ ให้คัดลอกลิงก์นี้ไปเปิดในเบราว์เซอร์:<br>
                      <a href="${resetUrl}" style="color: #2563eb;">${resetUrl}</a>
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding: 20px 40px; background-color: #f8fafc; border-top: 1px solid #e2e8f0;">
                    <p style="margin: 0; color: #94a3b8; font-size: 13px; line-height: 1.6;">
                      หากคุณไม่ได้ร้องขอการเปลี่ยนรหัสผ่าน สามารถเพิกเฉยต่ออีเมลฉบับนี้ได้<br>
                      อีเมลฉบับนี้ส่งจากระบบอัตโนมัติ กรุณาอย่าตอบกลับ<br><br>
                      &copy; 2026 SchoolSaver. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  });

  return { expiresAt, sent: true };
}

export async function getPasswordResetTokenStatus(token: string): Promise<PasswordResetTokenStatus> {
  const tokenHash = hashPasswordResetToken(token);
  const passwordResetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: {
      usedAt: true,
      expiresAt: true,
      user: { select: { status: true } },
    },
  });

  if (!passwordResetToken || passwordResetToken.user.status !== "ACTIVE") return "invalid";
  if (passwordResetToken.usedAt) return "used";
  if (passwordResetToken.expiresAt <= new Date()) return "expired";
  return "valid";
}
