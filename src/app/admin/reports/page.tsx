import { EmptyState } from "@/components/ui/EmptyState";
import { getAdminReportsAction } from "@/features/admin/actions";
import { ExportXlsxButton } from "@/features/admin/components/AdminClientControls";
import { formatMoney } from "@/lib/money";
import { formatThaiDateTime } from "@/lib/date";

export default async function AdminReportsPage() {
  const result = await getAdminReportsAction();
  if (!result.success) return <EmptyState title="ไม่สามารถดึงรายงานได้" description={result.message} />;
  const workspaceRows = result.data.workspaceUsage.map((workspace) => ({ workspace: workspace.name, status: workspace.status, users: workspace._count.workspaceMembers, members: workspace._count.members, rounds: workspace._count.rounds, transactions: workspace._count.paymentTransactions, createdAt: formatThaiDateTime(workspace.createdAt) }));
  const userRows = result.data.userGrowth.map((row) => ({ status: row.status, role: row.role, count: row._count._all }));
  const logRows = result.data.logTotals.map((row) => ({ outcome: row.outcome, count: row._count._all }));

  return (
    <div className="grid gap-5">
      <Header title="รายงานและส่งออก" description="รายงานการใช้งาน การเติบโตของผู้ใช้ ยอดชำระ ยอดค้าง และกิจกรรม/ความปลอดภัย พร้อมส่งออก Excel" />
      <section className="grid gap-3 md:grid-cols-4">
        <Metric label="ยอดชำระรวม" value={formatMoney(result.data.paidTotals._sum.amount ?? 0)} />
        <Metric label="จำนวนธุรกรรม" value={result.data.paidTotals._count._all.toLocaleString("th-TH")} />
        <Metric label="ยอดค้างรวม" value={formatMoney(result.data.outstandingTotals._sum.remainingAmount ?? 0)} />
        <Metric label="รายการค้าง" value={result.data.outstandingTotals._count._all.toLocaleString("th-TH")} />
      </section>
      <section className="grid gap-5 xl:grid-cols-3">
        <ReportCard title="การใช้งานเวิร์กสเปซ" rows={workspaceRows} filename="workspace-usage.xlsx" />
        <ReportCard title="การเติบโตของผู้ใช้" rows={userRows} filename="user-growth.xlsx" />
        <ReportCard title="กิจกรรม / ความปลอดภัย" rows={logRows} filename="activity-security.xlsx" />
      </section>
    </div>
  );
}
function Header({ title, description }: { title: string; description: string }) {
  return <div><h1 className="text-2xl font-black text-slate-950">{title}</h1><p className="mt-1 text-sm text-slate-500">{description}</p></div>;
}
function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-white p-4 shadow-sm"><p className="text-sm font-semibold text-slate-500">{label}</p><p className="mt-2 text-xl font-black text-slate-950">{value}</p></div>;
}
function ReportCard({ title, rows, filename }: { title: string; rows: Array<Record<string, unknown>>; filename: string }) {
  return <div className="rounded-2xl bg-white p-4 shadow-sm"><div className="mb-3 flex items-center justify-between gap-3"><h2 className="font-black text-slate-950">{title}</h2><ExportXlsxButton filename={filename} rows={rows} /></div><p className="text-sm text-slate-500">พร้อมส่งออก {rows.length.toLocaleString("th-TH")} แถว</p></div>;
}
