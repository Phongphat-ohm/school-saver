import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { LayoutDashboard, LogOut, ShieldCheck, UserRound } from "lucide-react";
import { logoutAction } from "@/features/auth/actions";
import { AdminSidebarNav } from "@/features/admin/components/AdminSidebarNav";
import { requireSuperAdmin } from "@/lib/permissions";

export async function SuperAdminShell({ children }: { children: ReactNode }) {
  const user = await requireSuperAdmin();

  return (
    <div className="app-grid-bg h-dvh overflow-hidden text-slate-900">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 shrink-0 lg:block">
        <div className="flex h-screen flex-col overflow-hidden bg-[#11152e] p-5 text-white shadow-2xl shadow-blue-950/20">
        <div className="mb-8 flex items-center gap-3">
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
            <p className="text-xs font-semibold text-emerald-300">ผู้ดูแลแพลตฟอร์ม</p>
          </div>
        </div>

        <AdminSidebarNav />

        <form action={logoutAction} className="border-t border-white/10 pt-3">
          <button className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium text-slate-400 transition hover:bg-white/10 hover:text-white">
            <LogOut size={17} />
            ออกจากระบบ
          </button>
        </form>
        </div>
      </aside>

      <div className="flex h-screen min-w-0 max-w-full flex-1 flex-col overflow-y-scroll pt-20 lg:pl-64">
        <header className="fixed inset-x-0 top-0 z-20 px-3 py-3 backdrop-blur sm:px-4 sm:py-4 lg:left-64">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="hidden min-w-0 lg:block">
                <h1 className="truncate text-lg font-bold text-slate-950">ผู้ดูแลสูงสุด</h1>
                <p className="truncate text-xs text-slate-500">ควบคุมข้อมูลและตรวจสอบระบบกลาง</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1 rounded-[1.5rem] bg-white/85 p-1.5 shadow-sm sm:gap-2">
              <div className="grid size-10 place-items-center rounded-2xl bg-emerald-50 text-emerald-700 lg:hidden">
                <ShieldCheck size={19} />
              </div>
              <div className="hidden items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 sm:flex">
                <div className="grid size-8 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                  <UserRound size={17} />
                </div>
                <div className="min-w-0">
                  <p className="max-w-32 truncate text-sm font-bold leading-4 text-slate-800">{user.fullName}</p>
                  <p className="text-[11px] font-semibold leading-4 text-emerald-700">{user.role}</p>
                </div>
              </div>
              <Link className="inline-flex min-h-10 items-center justify-center rounded-2xl bg-slate-100 px-4 text-sm font-bold text-slate-700 hover:bg-slate-200" href="/dashboard">
                <LayoutDashboard className="mr-2" size={16} />
                แดชบอร์ด
              </Link>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl min-w-0 flex-1 px-4 py-5 pb-10 lg:px-6">{children}</main>
      </div>
    </div>
  );
}
