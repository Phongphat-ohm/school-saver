import Image from "next/image";
import Link from "next/link";
import { BookOpenText, BriefcaseBusiness, ShieldCheck } from "lucide-react";
import { routes } from "@/constants/routes";
import { getCurrentAppVersion } from "@/lib/app-version";

export async function Footer() {
  const currentVersion = await getCurrentAppVersion();

  return (
    <footer className="mt-8 rounded-[1.75rem] border border-white/70 bg-white/85 p-4 shadow-sm backdrop-blur sm:p-5">
      <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
        <div className="flex min-w-0 items-start gap-3">
          <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-blue-50">
            <Image src="/images/school-saver-logo.webp" alt="SchoolSaver" width={38} height={38} className="size-9 rounded-xl object-contain" />
          </div>
          <div className="min-w-0">
            <p className="text-base font-black text-slate-950">SchoolSaver</p>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
              ระบบเก็บเงินห้องอัจฉริยะ จัดการ workspace สมาชิก รอบเก็บเงิน และรายงานโดยแยกข้อมูลตามสิทธิ์อย่างชัดเจน
            </p>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-3 md:min-w-[360px]">
          <Link href={routes.workspaces} className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-slate-50 px-3 text-sm font-bold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700">
            <BriefcaseBusiness size={17} />
            Workspace
          </Link>
          <Link href={routes.help} className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-slate-50 px-3 text-sm font-bold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700">
            <BookOpenText size={17} />
            วิธีใช้งาน
          </Link>
          <Link href={routes.settings} className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-slate-50 px-3 text-sm font-bold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700">
            <ShieldCheck size={17} />
            ตั้งค่า
          </Link>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4 text-xs font-medium text-slate-400">
        <p>© {new Date().getFullYear()} SchoolSaver</p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-slate-100 px-2.5 py-1 font-black text-slate-500">v{currentVersion.version}</span>
          <p>เก็บเงินห้องง่ายขึ้น ตรวจสอบได้ทุกยอด</p>
        </div>
      </div>
    </footer>
  );
}
