import type { ReactNode } from "react";
import { BottomNav } from "@/components/layout/BottomNav";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { SupportModeBanner } from "@/features/admin/components/SupportModeBanner";
import { requireUser } from "@/lib/auth";

export async function AppLayout({ children }: { children: ReactNode }) {
  await requireUser();
  return (
    <div className="app-grid-bg h-dvh overflow-hidden text-slate-900">
      <div className="relative z-0 flex min-h-dvh">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col pt-20 h-screen overflow-y-scroll">
          <Header />
          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-5 pb-36 lg:px-6 lg:pb-6">
            <SupportModeBanner />
            {children}
            <Footer />
          </main>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
