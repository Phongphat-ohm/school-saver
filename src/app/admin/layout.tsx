import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { SuperAdminShell } from "@/features/admin/components/SuperAdminShell";
import { requireSuperAdmin } from "@/lib/permissions";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  try {
    await requireSuperAdmin();
  } catch {
    notFound();
  }

  return <SuperAdminShell>{children}</SuperAdminShell>;
}
