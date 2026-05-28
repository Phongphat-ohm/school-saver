"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, BellRing, BriefcaseBusiness, DatabaseBackup, FileSpreadsheet, Flag, GitBranch, HeartPulse, LifeBuoy, ReceiptText, Settings, ShieldAlert, ShieldCheck, UsersRound, WalletCards } from "lucide-react";

const adminNavGroups = [
  {
    title: "แพลตฟอร์ม",
    items: [{ href: "/admin/dashboard", label: "ศูนย์ควบคุม", icon: ShieldCheck }],
  },
  {
    title: "จัดการข้อมูล",
    items: [
      { href: "/admin/workspaces", label: "เวิร์กสเปซ", icon: BriefcaseBusiness },
      { href: "/admin/users", label: "ผู้ใช้", icon: UsersRound },
    ],
  },
  {
    title: "ตรวจสอบระบบ",
    items: [
      { href: "/admin/audit", label: "ความปลอดภัย", icon: ShieldAlert },
      { href: "/admin/health", label: "สุขภาพเวิร์กสเปซ", icon: HeartPulse },
      { href: "/admin/finance", label: "การเงิน", icon: WalletCards },
      { href: "/admin/logs", label: "บันทึกกิจกรรม", icon: Activity },
      { href: "/admin/reports", label: "รายงาน / ส่งออก", icon: FileSpreadsheet },
    ],
  },
  {
    title: "เครื่องมือกลาง",
    items: [
      { href: "/admin/announcements", label: "ประกาศ", icon: BellRing },
      { href: "/admin/version-control", label: "Version Control", icon: GitBranch },
      { href: "/admin/exports", label: "ส่งออกข้อมูล", icon: DatabaseBackup },
      { href: "/admin/platform", label: "ลิมิต / ฟีเจอร์", icon: Flag },
      { href: "/admin/billing", label: "การใช้งานระบบ", icon: ReceiptText },
      { href: "/admin/support", label: "โหมดช่วยเหลือ", icon: LifeBuoy },
      { href: "/admin/settings", label: "ตั้งค่าแพลตฟอร์ม", icon: Settings },
    ],
  },
] as const;

export function AdminSidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="sidebar-scrollbar grid flex-1 content-start gap-5 overflow-y-auto pr-2">
      {adminNavGroups.map((group) => (
        <div key={group.title}>
          <p className="mb-2 px-3 text-xs font-black tracking-wide text-slate-400">{group.title}</p>
          <div className="grid gap-1">
            {group.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const activeClass = active ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/10 hover:text-white";
              const iconClass = active ? "text-emerald-300" : "text-slate-500 group-hover:text-emerald-300";

              return (
                <Link
                  className={`group flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-[15px] font-semibold transition ${activeClass}`}
                  href={item.href}
                  key={item.href}
                >
                  <item.icon size={19} className={`transition ${iconClass}`} />
                  <span className="min-w-0 truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
