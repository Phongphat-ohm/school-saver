import type { ReactNode } from "react";

export function DataTable({ children }: { children: ReactNode }) {
  return <div className="hidden overflow-visible rounded-2xl border border-slate-200 bg-white shadow-sm md:block">{children}</div>;
}
