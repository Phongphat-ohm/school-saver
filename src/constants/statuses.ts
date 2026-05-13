import type { MemberRoundStatus, RoundStatus } from "@/generated/prisma/client";

export const memberRoundStatusLabels: Record<MemberRoundStatus, string> = {
  UNPAID: "ยังไม่จ่าย",
  PARTIAL: "จ่ายบางส่วน",
  PAID: "จ่ายครบ",
  LATE_PAID: "จ่ายครบช้า",
  OVERDUE: "เลยกำหนด",
  PARTIAL_OVERDUE: "ค้างบางส่วน",
  WAIVED: "ยกเว้น",
};

export const roundStatusLabels: Record<RoundStatus, string> = {
  DRAFT: "แบบร่าง",
  OPEN: "เปิดใช้งาน",
  CLOSED: "ปิดรอบ",
  CANCELLED: "ยกเลิก",
};

export const statusTone: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
  ACTIVE: "success",
  INACTIVE: "default",
  UNPAID: "default",
  PARTIAL: "warning",
  PAID: "success",
  LATE_PAID: "info",
  OVERDUE: "danger",
  PARTIAL_OVERDUE: "danger",
  WAIVED: "info",
  DRAFT: "default",
  OPEN: "success",
  CLOSED: "info",
  CANCELLED: "danger",
};
