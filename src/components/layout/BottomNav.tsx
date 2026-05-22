import Link from "next/link";
import { BriefcaseBusiness, CalendarClock, CircleAlert, Home, Menu, ShieldCheck, WalletCards } from "lucide-react";
import type { WorkspaceRole } from "@/generated/prisma/client";
import { routes } from "@/constants/routes";
import { getCurrentWorkspaceRole, isSuperAdmin } from "@/lib/permissions";

const items: Array<{ label: string; href: string; icon: typeof Home; allowedRoles: WorkspaceRole[] }> = [
  { label: "หน้าแรก", href: routes.dashboard, icon: Home, allowedRoles: ["OWNER", "ADMIN", "COLLECTOR", "VIEWER"] },
  { label: "Workspace", href: routes.workspaces, icon: BriefcaseBusiness, allowedRoles: ["OWNER", "ADMIN", "COLLECTOR", "VIEWER"] },
  { label: "รอบ", href: routes.rounds, icon: CalendarClock, allowedRoles: ["OWNER", "ADMIN", "COLLECTOR", "VIEWER"] },
  { label: "รับเงิน", href: routes.payments, icon: WalletCards, allowedRoles: ["OWNER", "ADMIN", "COLLECTOR"] },
  { label: "ค้างจ่าย", href: routes.overdue, icon: CircleAlert, allowedRoles: ["OWNER", "ADMIN", "COLLECTOR"] },
  { label: "เมนู", href: routes.settings, icon: Menu, allowedRoles: ["OWNER", "ADMIN", "COLLECTOR", "VIEWER"] },
] as const;

export async function BottomNav() {
  const [role, superAdmin] = await Promise.all([getCurrentWorkspaceRole(), isSuperAdmin()]);
  const visibleItems = role ? items.filter((item) => item.allowedRoles.includes(role)) : [{ label: "Workspace", href: routes.workspaces, icon: BriefcaseBusiness, allowedRoles: [] }];
  const navItems = superAdmin ? [{ label: "Admin", href: routes.admin, icon: ShieldCheck, allowedRoles: [] }, ...visibleItems].slice(0, 6) : visibleItems;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 grid border-t border-slate-200 bg-white/95 px-1.5 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 backdrop-blur lg:hidden"
      style={{ gridTemplateColumns: `repeat(${navItems.length || 1}, minmax(0, 1fr))` }}
    >
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="grid min-h-14 justify-items-center gap-1 rounded-2xl px-1.5 py-2 text-center text-[10px] font-semibold text-slate-600 hover:bg-blue-50 hover:text-blue-700"
        >
          <item.icon size={18} />
          <span className="leading-none">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
