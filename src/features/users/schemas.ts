import { z } from "zod";

const optionalEmailSchema = z.preprocess((value) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}, z.string().email("อีเมลไม่ถูกต้อง").nullable());

export const createWorkspaceUserSchema = z.object({
  username: z.string().trim().min(1, "กรุณากรอก username"),
  password: z.string().min(1, "กรุณากรอก password"),
  fullName: z.string().trim().min(1, "กรุณากรอกชื่อผู้ใช้"),
  email: optionalEmailSchema,
  role: z.enum(["OWNER", "ADMIN", "COLLECTOR", "VIEWER"]),
});

export const updateWorkspaceUserRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["OWNER", "ADMIN", "COLLECTOR", "VIEWER"]),
});

export const updateMyProfileSchema = z.object({
  fullName: z.string().trim().min(1, "กรุณากรอกชื่อผู้ใช้"),
  email: optionalEmailSchema,
});

export const verifyEmailOtpSchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, "กรุณากรอก OTP 6 หลัก"),
});

export const changeMyPasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "กรุณากรอกรหัสผ่านเดิม"),
    newPassword: z.string().min(6, "รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร"),
    confirmPassword: z.string().min(1, "กรุณายืนยันรหัสผ่านใหม่"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน",
    path: ["confirmPassword"],
  });

export const cancelMyAccountSchema = z.object({
  password: z.string().min(1, "กรุณากรอกรหัสผ่านเพื่อยืนยัน"),
  confirmText: z.string().trim(),
}).refine((data) => data.confirmText === "ยกเลิกบัญชี", {
  message: "กรุณาพิมพ์คำว่า ยกเลิกบัญชี เพื่อยืนยัน",
  path: ["confirmText"],
});

export const restoreCancelledAccountSchema = z.object({
  username: z.string().trim().min(1, "กรุณากรอกชื่อผู้ใช้"),
  email: optionalEmailSchema.refine((email) => !!email, "กรุณากรอกอีเมล"),
});

export const verifyRestoreAccountOtpSchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, "กรุณากรอก OTP 6 หลัก"),
});
