import { z } from "zod";

export const memberSchema = z.object({
  memberCode: z.string().trim().min(1, "กรุณากรอกรหัสสมาชิก"),
  studentNo: z.string().optional(),
  fullName: z.string().trim().min(1, "กรุณากรอกชื่อสมาชิก"),
  classroom: z.string().optional(),
  phone: z.string().optional(),
});

export const importMemberRowSchema = z.object({
  memberCode: z.string().trim().min(1, "รหัสสมาชิกห้ามว่าง"),
  studentNo: z.string().optional(),
  fullName: z.string().trim().min(1, "ชื่อสมาชิกห้ามว่าง"),
  classroom: z.string().optional(),
  phone: z.string().optional(),
});

export const importMembersSchema = z.object({
  rows: z.array(importMemberRowSchema).min(1, "ไม่พบข้อมูลสมาชิกสำหรับ import").max(1000, "import ได้สูงสุดครั้งละ 1,000 รายการ"),
});

export const googleSheetImportSchema = z.object({
  url: z.string().url("กรุณากรอกลิงก์ Google Sheet ให้ถูกต้อง"),
});
