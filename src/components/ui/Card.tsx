import type { HTMLAttributes } from "react";
import clsx from "clsx";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  const hasCustomBackground = typeof className === "string" && /(?:^|\s)bg-/.test(className);

  return (
    <div
      className={clsx(
        "rounded-3xl border border-white/70 p-4 shadow-sm",
        !hasCustomBackground && "bg-white",
        className,
      )}
      {...props}
    />
  );
}
