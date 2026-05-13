import type { ReactNode } from "react";
import { BottomNav } from "@/components/layout/BottomNav";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { requireUser } from "@/lib/auth";

export async function AppLayout({ children }: { children: ReactNode }) {
  await requireUser();
  return (
    <div className="h-dvh bg-[#dfe7ff] text-slate-900 [background-image:linear-gradient(rgba(30,64,175,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(30,64,175,0.08)_1px,transparent_1px)] [background-size:28px_28px] overflow-hidden">
      <div className="relative z-0 flex min-h-dvh">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col pt-20 h-screen overflow-y-scroll">
          <Header />
          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-5 pb-24 lg:px-6 lg:pb-6">{children}</main>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
