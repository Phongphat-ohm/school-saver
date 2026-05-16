import type { WorkspaceRole } from "@/generated/prisma/client";
import { cache } from "react";
import { hasAcceptedCurrentLegal } from "@/constants/legal";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

const writeRoles: WorkspaceRole[] = ["OWNER", "ADMIN"];
const collectRoles: WorkspaceRole[] = ["OWNER", "ADMIN", "COLLECTOR"];
const reportRoles: WorkspaceRole[] = ["OWNER", "ADMIN", "COLLECTOR", "VIEWER"];

export const getWorkspaceRole = cache(async function getWorkspaceRole(userId: string, workspaceId: string) {
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId, workspaceId, status: "ACTIVE" },
    select: { role: true },
  });
  return membership?.role ?? null;
});

export async function requireWorkspaceRole(allowedRoles: WorkspaceRole[]) {
  const session = await getSession();
  if (!session) throw new Error("กรุณาเข้าสู่ระบบ");
  const user = await prisma.user.findFirst({
    where: { id: session.userId, status: "ACTIVE" },
    select: { termsAcceptedAt: true, termsVersion: true, privacyAcceptedAt: true, privacyVersion: true },
  });
  if (!user || !hasAcceptedCurrentLegal(user)) throw new Error("กรุณายอมรับเงื่อนไขและนโยบายความเป็นส่วนตัวก่อนใช้งาน");
  if (!session.currentWorkspaceId) throw new Error("ยังไม่มี workspace ที่ใช้งานอยู่");
  const role = await getWorkspaceRole(session.userId, session.currentWorkspaceId);
  if (!role || !allowedRoles.includes(role)) {
    throw new Error("คุณไม่มีสิทธิ์ทำรายการนี้");
  }
  return { userId: session.userId, workspaceId: session.currentWorkspaceId, role };
}

export async function getCurrentWorkspaceRole() {
  const session = await getSession();
  if (!session || !session.currentWorkspaceId) return null;
  return getWorkspaceRole(session.userId, session.currentWorkspaceId);
}

export async function requireCurrentWorkspaceRole(allowedRoles: WorkspaceRole[]) {
  return requireWorkspaceRole(allowedRoles);
}

export function canManageMembers(role: WorkspaceRole | null) {
  return !!role && writeRoles.includes(role);
}

export function canManageRounds(role: WorkspaceRole | null) {
  return !!role && writeRoles.includes(role);
}

export function canCollectPayment(role: WorkspaceRole | null) {
  return !!role && collectRoles.includes(role);
}

export function canViewReports(role: WorkspaceRole | null) {
  return !!role && reportRoles.includes(role);
}

export function canManageWorkspaceUsers(role: WorkspaceRole | null) {
  return role === "OWNER" || role === "ADMIN";
}

export const OWNER_ONLY: WorkspaceRole[] = ["OWNER"];
export const OWNER_ADMIN: WorkspaceRole[] = ["OWNER", "ADMIN"];
export const COLLECT_PAYMENT: WorkspaceRole[] = ["OWNER", "ADMIN", "COLLECTOR"];
export const VIEW_REPORTS: WorkspaceRole[] = ["OWNER", "ADMIN", "COLLECTOR", "VIEWER"];
