import type { InputHTMLAttributes } from "react";
import clsx from "clsx";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
};

export function Input({ label, className, ...props }: InputProps) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-slate-700">
      {label ? <span>{label}</span> : null}
      <input
        className={clsx(
          "min-h-11 rounded-2xl border border-slate-200 bg-white px-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100",
          className,
        )}
        {...props}
      />
    </label>
  );
}
