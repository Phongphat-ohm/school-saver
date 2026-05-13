import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().trim().min(1, "กรุณากรอก username"),
  password: z.string().min(1, "กรุณากรอก password"),
});

export const registerSchema = z
  .object({
    username: z.string().trim().min(3, "username ต้องมีอย่างน้อย 3 ตัวอักษร"),
    password: z.string().min(6, "password ต้องมีอย่างน้อย 6 ตัวอักษร"),
    confirmPassword: z.string().min(1, "กรุณายืนยัน password"),
    fullName: z.string().trim().min(1, "กรุณากรอกชื่อผู้ใช้"),
    workspaceName: z.string().trim().min(1, "กรุณากรอกชื่อ workspace"),
    workspaceDescription: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "password และยืนยัน password ไม่ตรงกัน",
    path: ["confirmPassword"],
  });
