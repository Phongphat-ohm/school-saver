import { z } from "zod";

export const createWorkspaceUserSchema = z.object({
  username: z.string().trim().min(1, "กรุณากรอก username"),
  password: z.string().min(1, "กรุณากรอก password"),
  fullName: z.string().trim().min(1, "กรุณากรอกชื่อผู้ใช้"),
  role: z.enum(["OWNER", "ADMIN", "COLLECTOR", "VIEWER"]),
});

export const updateWorkspaceUserRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["OWNER", "ADMIN", "COLLECTOR", "VIEWER"]),
});

export const updateMyProfileSchema = z.object({
  fullName: z.string().trim().min(1, "กรุณากรอกชื่อผู้ใช้"),
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
