import { z } from "zod";

export const workspaceSchema = z.object({
  name: z.string().trim().min(1, "กรุณากรอกชื่อ workspace"),
  description: z.string().optional(),
});

export const inviteUserSchema = z.object({
  username: z.string().trim().min(1, "กรุณากรอก username"),
  role: z.enum(["OWNER", "ADMIN", "COLLECTOR", "VIEWER"]),
});

export const workspaceUserSearchSchema = z.object({
  keyword: z.string().trim().min(1, "กรุณากรอกคำค้นหา"),
});

export const sendWorkspaceInvitationSchema = z.object({
  userId: z.string().min(1, "ไม่พบผู้ใช้"),
  role: z.enum(["OWNER", "ADMIN", "COLLECTOR", "VIEWER"]),
  message: z.string().optional(),
});

export const updateWorkspaceMemberRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["OWNER", "ADMIN", "COLLECTOR", "VIEWER"]),
});

export const removeWorkspaceMemberSchema = z.object({
  userId: z.string().min(1),
});
