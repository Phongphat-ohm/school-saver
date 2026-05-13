import Image from "next/image";
import Link from "next/link";
import {
  BriefcaseBusiness,
  BookOpenText,
  CalendarClock,
  ChartNoAxesCombined,
  CircleAlert,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Settings,
  UserCog,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { logoutAction } from "@/features/auth/actions";
import { getNavigationItemsForRole, navigationGroups } from "@/constants/routes";
import { getCurrentWorkspaceRole } from "@/lib/permissions";

const icons = {
  LayoutDashboard,
  BriefcaseBusiness,
  CalendarClock,
  WalletCards,
  CircleAlert,
  UsersRound,
  CreditCard,
  UserCog,
  ChartNoAxesCombined,
  BookOpenText,
  Settings,
};

export async function Sidebar() {
  const role = await getCurrentWorkspaceRole();
  const visibleItems = getNavigationItemsForRole(role);

  return (
    <aside className="relative z-10 hidden min-h-screen w-64 shrink-0 lg:block">
      <div className="flex h-screen flex-col overflow-hidden bg-[#11152e] p-5 text-white shadow-2xl shadow-blue-950/20">
        <div className="mb-6 flex items-center gap-3 px-1">
          <Image
            src="/images/school-saver-logo.webp"
            alt="SchoolSaver"
            width={44}
            height={44}
            className="size-11 rounded-2xl object-contain"
            priority
          />
          <div className="min-w-0">
            <p className="truncate text-xl font-black">SchoolSaver</p>
            <p className="text-[13px] text-slate-400">Smart classroom saving</p>
          </div>
        </div>
        <nav className="grid flex-1 content-start gap-5 overflow-y-auto pr-1">
          {navigationGroups.map((group) => (
            <div key={group}>
              <p className="mb-2 px-3 text-xs font-black tracking-wide text-slate-400">{group}</p>
              <div className="grid gap-1">
                {visibleItems
                  .filter((item) => item.group === group)
                  .map((item) => {
                    const Icon = icons[item.icon as keyof typeof icons] ?? LayoutDashboard;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="group flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-[15px] font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
                      >
                        <Icon size={19} className="text-slate-500 transition group-hover:text-blue-300" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
              </div>
            </div>
          ))}
        </nav>
        <form action={logoutAction} className="mt-4 border-t border-white/10 pt-3">
          <button className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium text-slate-400 transition hover:bg-white/10 hover:text-white">
            <LogOut size={17} />
            Logout
          </button>
        </form>
      </div>
    </aside>
  );
}
