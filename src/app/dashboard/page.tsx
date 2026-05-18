import { AppLayout } from "@/components/layout/AppLayout";
import Link from "next/link";
import { DashboardCards } from "@/features/dashboard/components/DashboardCards";
import { OpenRounds } from "@/features/dashboard/components/OpenRounds";
import { RecentTransactions } from "@/features/dashboard/components/RecentTransactions";
import { RoundTotals } from "@/features/dashboard/components/RoundTotals";
import { getDashboardSummaryAction } from "@/features/dashboard/actions";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function DashboardPage() {
  const result = await getDashboardSummaryAction();
  return (
    <AppLayout>
      {!result.success ? (
        <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
          <EmptyState title="ยังไม่มี workspace" description="สร้าง workspace ใหม่ หรือขอเข้า workspace จาก QR/ลิงก์เชิญเพื่อเริ่มใช้งาน SchoolSaver" />
          <Link href="/workspaces" className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-bold text-white">
            ไปที่หน้า Workspace
          </Link>
        </div>
      ) : (
        <div className="grid gap-5">
          <DashboardCards summary={result.data} />
          <RoundTotals rounds={result.data.roundSummaries} />
          <div className="grid gap-5 xl:grid-cols-2">
            <RecentTransactions transactions={result.data.recentTransactions} />
            <OpenRounds rounds={result.data.openRounds} />
          </div>
        </div>
      )}
    </AppLayout>
  );
}
