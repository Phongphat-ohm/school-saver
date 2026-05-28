"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps, ReactNode } from "react";
import clsx from "clsx";

type NavLinkProps = Omit<ComponentProps<typeof Link>, "href" | "children"> & {
  href: string;
  children: ReactNode;
  activeClassName?: string;
  exact?: boolean;
  pendingClassName?: string;
  showPendingIndicator?: boolean;
};

function PendingIndicator() {
  const { pending } = useLinkStatus();

  return (
    <span
      aria-hidden="true"
      className={clsx(
        "ml-auto size-1.5 shrink-0 rounded-full bg-current opacity-0 transition-opacity delay-100",
        pending && "opacity-80",
      )}
    />
  );
}

export function NavLink({
  href,
  children,
  className,
  activeClassName,
  exact = false,
  pendingClassName,
  showPendingIndicator = true,
  prefetch = true,
  ...props
}: NavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href || (!exact && href !== "/" && pathname.startsWith(`${href}/`));

  return (
    <Link
      href={href}
      prefetch={prefetch}
      aria-current={isActive ? "page" : undefined}
      className={clsx(className, isActive && activeClassName, pendingClassName)}
      {...props}
    >
      {children}
      {showPendingIndicator ? <PendingIndicator /> : null}
    </Link>
  );
}
