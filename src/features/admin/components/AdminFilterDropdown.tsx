import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronDown, SlidersHorizontal } from "lucide-react";

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
    <details className="group max-w-full overflow-hidden rounded-2xl border border-white/80 bg-white/90 shadow-sm" open={activeCount > 0}>
      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-600">
            <SlidersHorizontal size={18} />
          </div>
          <div className="min-w-0 max-w-full">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-black text-slate-950">{title}</p>
              {activeCount > 0 ? <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-black text-white">{activeCount}</span> : null}
            </div>
            <p className="truncate text-sm text-slate-500">{description}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {activeCount > 0 ? (
            <Link className="hidden rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 sm:inline-flex" href={resetHref}>
              ล้างตัวกรอง
            </Link>
          ) : null}
          <ChevronDown className="text-slate-400 transition group-open:rotate-180" size={18} />
        </div>
      </summary>
      <div className="max-w-full overflow-hidden border-t border-slate-100 p-4 pt-3">{children}</div>
    </details>
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
