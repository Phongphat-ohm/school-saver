import { createHash, randomInt } from "crypto";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

const OTP_EXPIRES_IN_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;

function hashOtp(code: string, email: string) {
  const secret = process.env.SESSION_SECRET ?? "school-saver-dev-secret";
  return createHash("sha256").update(`${code}:${email.toLowerCase()}:${secret}`).digest("hex");
}

function generateOtp() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export async function sendEmailWithResend(input: { to: string; subject: string; text: string; html: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) throw new Error("ยังไม่ได้ตั้งค่า RESEND_API_KEY หรือ RESEND_FROM_EMAIL");

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });

  if (error) throw new Error(error.message || "ส่งอีเมลผ่าน Resend ไม่สำเร็จ");
}

export async function issueEmailVerificationOtp(userId: string, email: string) {
  const code = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_EXPIRES_IN_MINUTES * 60 * 1000);

  await prisma.$transaction(async (tx) => {
    await tx.emailVerificationOtp.updateMany({
      where: { userId, email, verifiedAt: null },
      data: { verifiedAt: new Date() },
    });
    await tx.emailVerificationOtp.create({
      data: {
        userId,
        email,
        codeHash: hashOtp(code, email),
        expiresAt,
      },
    });
  });

  await sendEmailWithResend({
    to: email,
    subject: "รหัสยืนยันทำรายการ SchoolSaver",
    text: `รหัส OTP ของคุณคือ ${code} รหัสนี้ใช้ได้ ${OTP_EXPIRES_IN_MINUTES} นาที`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ยืนยันอีเมล SchoolSaver</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">

        <!-- พื้นหลังและจัดกึ่งกลาง -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed; background-color: #f8fafc; padding: 40px 20px;">
          <tr>
            <td align="center">
              <!-- กล่องข้อความหลัก (Card) -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); overflow: hidden;">
                
                <!-- ส่วนหัว: โลโก้ -->
                <tr>
                  <td align="center" style="padding: 40px 40px 20px 40px;">
                    <!-- เปลี่ยน src เป็น URL รูปโลโก้ของ SchoolSaver -->
                    <img src="https://schf.ppkxb.space/images/school-saver-logo.png" alt="SchoolSaver" width="200" style="display: block; max-width: 100%; height: auto;">
                  </td>
                </tr>

                <!-- ส่วนเนื้อหา -->
                <tr>
                  <td align="center" style="padding: 0 40px 20px 40px;">
                    <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 24px; font-weight: 700;">ยืนยันการทำรายการ</h2>
                    <p style="margin: 0; color: #475569; font-size: 16px; line-height: 1.5;">
                      กรุณานำรหัส OTP ด้านล่างนี้ไปกรอกในหน้าทำรายการเพื่อเสร็จขั้นตอนการทำงานของคุณ
                    </p>
                  </td>
                </tr>

                <!-- กล่องเน้นรหัส OTP -->
                <tr>
                  <td align="center" style="padding: 10px 40px 30px 40px;">
                    <div style="background-color: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 8px; padding: 24px; display: inline-block;">
                      <p style="margin: 0; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #2563eb; text-align: center;">
                        ${code}
                      </p>
                    </div>
                  </td>
                </tr>

                <!-- เวลาหมดอายุ -->
                <tr>
                  <td align="center" style="padding: 0 40px 40px 40px;">
                    <p style="margin: 0; color: #ef4444; font-size: 14px; font-weight: 500;">
                      ⏳ รหัสนี้ใช้ได้ ${OTP_EXPIRES_IN_MINUTES} นาที
                    </p>
                  </td>
                </tr>

                <!-- ส่วนท้าย (Footer) -->
                <tr>
                  <td align="center" style="padding: 20px 40px; background-color: #f8fafc; border-top: 1px solid #e2e8f0;">
                    <p style="margin: 0; color: #94a3b8; font-size: 13px; line-height: 1.6;">
                      หากคุณไม่ได้ทำการร้องขอรหัสนี้ คุณสามารถเพิกเฉยต่ออีเมลฉบับนี้ได้เลย<br>
                      อีเมลฉบับนี้เป็นการส่งจากระบบอัตโนมัติ กรุณาอย่าตอบกลับ<br><br>
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

  return { expiresAt };
}

export async function verifyEmailOtp(userId: string, email: string, code: string) {
  const otp = await prisma.emailVerificationOtp.findFirst({
    where: {
      userId,
      email,
      verifiedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!otp) return { ok: false as const, message: "รหัส OTP หมดอายุหรือไม่พบรหัสล่าสุด" };
  if (otp.attempts >= OTP_MAX_ATTEMPTS) return { ok: false as const, message: "ลองกรอกรหัสเกินจำนวนครั้งที่กำหนด กรุณาขอรหัสใหม่" };

  const matched = otp.codeHash === hashOtp(code, email);
  if (!matched) {
    await prisma.emailVerificationOtp.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false as const, message: "รหัส OTP ไม่ถูกต้อง" };
  }

  const verifiedAt = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.emailVerificationOtp.update({
      where: { id: otp.id },
      data: { verifiedAt },
    });
    await tx.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: verifiedAt },
    });
  });

  return { ok: true as const, verifiedAt };
}
