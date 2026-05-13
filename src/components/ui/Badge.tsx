import type { ReactNode } from "react";
import clsx from "clsx";

const tones = {
  default: "bg-slate-100 text-slate-700",
  success: "bg-green-100 text-green-700",
  warning: "bg-amber-100 text-amber-800",
  danger: "bg-red-100 text-red-700",
  info: "bg-sky-100 text-sky-700",
};

export function Badge({ children, tone = "default" }: { children: ReactNode; tone?: keyof typeof tones }) {
  return <span className={clsx("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", tones[tone])}>{children}</span>;
}
