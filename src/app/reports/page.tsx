import { AppLayout } from "@/components/layout/AppLayout";
import { RoleGate } from "@/components/layout/RoleGate";
import { Card } from "@/components/ui/Card";
import { DailyReport } from "@/features/reports/components/DailyReport";
import { getDailyReportAction } from "@/features/reports/actions";

export default async function ReportsPage() {
  const daily = await getDailyReportAction(new Date());
  return (
    <AppLayout>
      <RoleGate allowedRoles={["OWNER", "ADMIN", "COLLECTOR", "VIEWER"]}>
        <div className="grid gap-5">
        <div>
          <h2 className="text-2xl font-bold text-slate-950">รายงาน</h2>
          <p className="text-sm text-slate-500">รายงานทั้งหมดคำนวณจาก workspace ปัจจุบันเท่านั้น</p>
        </div>
        <Card>
          <h3 className="mb-4 text-lg font-bold">รายงานรายวัน</h3>
          {daily.success ? <DailyReport report={daily.data} /> : <p>{daily.message}</p>}
        </Card>
        </div>
      </RoleGate>
    </AppLayout>
  );
}
