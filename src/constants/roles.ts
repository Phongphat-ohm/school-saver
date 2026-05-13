import type { WorkspaceRole } from "@/generated/prisma/client";

export const roleLabels: Record<WorkspaceRole, string> = {
  OWNER: "เจ้าของ",
  ADMIN: "ผู้ดูแล",
  COLLECTOR: "ผู้เก็บเงิน",
  VIEWER: "ผู้ดูรายงาน",
};

export const roleOptions = Object.entries(roleLabels).map(([value, label]) => ({ value, label }));
