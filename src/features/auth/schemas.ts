import { z } from "zod";

const optionalEmailSchema = z.preprocess((value) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}, z.string().email("อีเมลไม่ถูกต้อง").nullable());

export const loginSchema = z.object({
  username: z.string().trim().min(1, "กรุณากรอกชื่อผู้ใช้"),
  password: z.string().min(1, "กรุณากรอกรหัสผ่าน"),
});

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(1, "กรุณากรอกชื่อ"),
    username: z.string().trim().min(3, "ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร"),
    email: optionalEmailSchema,
    password: z.string().min(6, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"),
    confirmPassword: z.string().min(1, "กรุณายืนยันรหัสผ่าน"),
    acceptTerms: z.literal(true, {
      error: "กรุณายอมรับเงื่อนไขการให้บริการ",
    }),
    acceptPrivacy: z.literal(true, {
      error: "กรุณายินยอมและรับทราบนโยบายคุ้มครองข้อมูลส่วนบุคคล",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน",
    path: ["confirmPassword"],
  });

export const verifyEmailOtpSchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, "กรุณากรอก OTP 6 หลัก"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("อีเมลไม่ถูกต้อง"),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "ลิงก์เปลี่ยนรหัสผ่านไม่ถูกต้อง"),
    password: z.string().min(6, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"),
    confirmPassword: z.string().min(1, "กรุณายืนยันรหัสผ่าน"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน",
    path: ["confirmPassword"],
  });
