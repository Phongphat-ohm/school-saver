"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { useClickOutside } from "@/hooks/useClickOutside";

type AdminFilterDropdownClientProps = {
  title: string;
  description: string;
  activeCount: number;
  resetHref: string;
  children: ReactNode;
};

export function AdminFilterDropdownClient({
  title,
  description,
  activeCount,
  resetHref,
  children,
}: AdminFilterDropdownClientProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [open, setOpen] = useState(activeCount > 0);
  const closeDropdown = useCallback(() => setOpen(false), []);
  useClickOutside(detailsRef, closeDropdown, open);

  useEffect(() => {
    if (activeCount > 0) setOpen(true);
  }, [activeCount]);

  return (
    <details
      ref={detailsRef}
      className="group max-w-full overflow-hidden rounded-2xl border border-white/80 bg-white/90 shadow-sm"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
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
