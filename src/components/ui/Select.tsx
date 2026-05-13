import type { SelectHTMLAttributes } from "react";
import clsx from "clsx";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  options?: Array<{ label: string; value: string }>;
};

export function Select({ label, options, className, children, ...props }: SelectProps) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-slate-700">
      {label ? <span>{label}</span> : null}
      <select
        className={clsx(
          "min-h-11 rounded-2xl border border-slate-200 bg-white px-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100",
          className,
        )}
        {...props}
      >
        {options?.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
        {children}
      </select>
    </label>
  );
}
