import type { ReactNode } from "react";
import { AdminFilterDropdownClient } from "@/features/admin/components/AdminFilterDropdownClient";

type AdminFilterDropdownProps = {
  title?: string;
  description?: string;
  activeCount?: number;
  resetHref: string;
  children: ReactNode;
};

export function AdminFilterDropdown({
  title = "ตัวกรองข้อมูล",
  description = "ค้นหาและจำกัดข้อมูลที่ต้องการดู",
  activeCount = 0,
  resetHref,
  children,
}: AdminFilterDropdownProps) {
  return (
    <AdminFilterDropdownClient title={title} description={description} activeCount={activeCount} resetHref={resetHref}>
      {children}
    </AdminFilterDropdownClient>
  );
}

export function countActiveFilters(params: Record<string, string | undefined>, ignored: string[] = ["page", "pageSize"]) {
  const ignoredSet = new Set(ignored);
  return Object.entries(params).filter(([key, value]) => !ignoredSet.has(key) && !!value).length;
}

export const adminFilterFormClass = "flex max-w-full flex-wrap items-end gap-3";
export const adminFilterFieldClass = "min-h-11 min-w-0 flex-[1_1_180px] rounded-2xl border border-slate-200 px-3 text-sm";
export const adminFilterSearchClass = "min-h-11 min-w-0 flex-[2_1_260px] rounded-2xl border border-slate-200 px-4 text-sm";
export const adminFilterSmallFieldClass = "min-h-11 min-w-0 flex-[1_1_130px] rounded-2xl border border-slate-200 px-3 text-sm";
export const adminFilterButtonClass = "min-h-11 flex-[0_0_auto] rounded-2xl bg-blue-600 px-5 text-sm font-bold text-white";
