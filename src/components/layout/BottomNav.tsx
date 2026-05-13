import Link from "next/link";
import { CalendarClock, CircleAlert, Home, Menu, WalletCards } from "lucide-react";
import type { WorkspaceRole } from "@/generated/prisma/client";
import { routes } from "@/constants/routes";
import { getCurrentWorkspaceRole } from "@/lib/permissions";

const items: Array<{ label: string; href: string; icon: typeof Home; allowedRoles: WorkspaceRole[] }> = [
  { label: "หน้าแรก", href: routes.dashboard, icon: Home, allowedRoles: ["OWNER", "ADMIN", "COLLECTOR", "VIEWER"] },
  { label: "รอบ", href: routes.rounds, icon: CalendarClock, allowedRoles: ["OWNER", "ADMIN", "COLLECTOR", "VIEWER"] },
  { label: "รับเงิน", href: routes.payments, icon: WalletCards, allowedRoles: ["OWNER", "ADMIN", "COLLECTOR"] },
  { label: "ค้างจ่าย", href: routes.overdue, icon: CircleAlert, allowedRoles: ["OWNER", "ADMIN", "COLLECTOR"] },
  { label: "เมนู", href: routes.settings, icon: Menu, allowedRoles: ["OWNER", "ADMIN", "COLLECTOR", "VIEWER"] },
] as const;

export async function BottomNav() {
  const role = await getCurrentWorkspaceRole();
  const visibleItems = items.filter((item) => role && item.allowedRoles.includes(role));

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 grid border-t border-slate-200 bg-white/95 px-2 py-2 backdrop-blur lg:hidden"
      style={{ gridTemplateColumns: `repeat(${visibleItems.length || 1}, minmax(0, 1fr))` }}
    >
      {visibleItems.map((item) => (
        <Link key={item.href} href={item.href} className="grid justify-items-center gap-1 rounded-2xl px-2 py-2 text-center text-[11px] font-semibold text-slate-600 hover:bg-blue-50 hover:text-blue-700">
          <item.icon size={18} />
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
