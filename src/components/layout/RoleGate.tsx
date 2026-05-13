import type { ReactNode } from "react";
import type { WorkspaceRole } from "@/generated/prisma/client";
import { EmptyState } from "@/components/ui/EmptyState";
import { getCurrentWorkspaceRole } from "@/lib/permissions";

export async function RoleGate({ allowedRoles, children }: { allowedRoles: WorkspaceRole[]; children: ReactNode }) {
  const role = await getCurrentWorkspaceRole();
  if (!role || !allowedRoles.includes(role)) {
    return <EmptyState title="คุณไม่มีสิทธิ์เข้าใช้งานหน้านี้" description="เมนูนี้ถูกจำกัดตาม role ใน workspace ปัจจุบัน" />;
  }
  return <>{children}</>;
}
