import { EmptyState } from "@/components/ui/EmptyState";
import { getAdminWorkspaceHealthAction } from "@/features/admin/actions";
import {
  AdminFilterDropdown,
  adminFilterButtonClass,
  adminFilterFormClass,
  adminFilterSearchClass,
  adminFilterSmallFieldClass,
  countActiveFilters,
} from "@/features/admin/components/AdminFilterDropdown";
import { AdminPagination } from "@/features/admin/components/AdminPagination";
import { formatThaiDateTime } from "@/lib/date";
import { formatMoney } from "@/lib/money";

export default async function AdminWorkspaceHealthPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const result = await getAdminWorkspaceHealthAction(params);
  if (!result.success) return <EmptyState title="ไม่สามารถดึงสุขภาพเวิร์กสเปซได้" description={result.message} />;

  return (
    <div className="grid gap-5">
      <Header title="ตัวตรวจสุขภาพเวิร์กสเปซ" description="คะแนนสุขภาพจากกิจกรรม เจ้าของ ลิมิตสมาชิก payment error และยอดค้าง" />
      <AdminFilterDropdown activeCount={countActiveFilters(params)} description="ค้นหาเวิร์กสเปซ/เจ้าของ และกรองตามสถานะ คะแนนสุขภาพ และจำนวนต่อหน้า" resetHref="/admin/health">
        <form className={adminFilterFormClass}>
          <input name="page" type="hidden" value="1" />
          <input name="q" defaultValue={params.q ?? ""} className={adminFilterSearchClass} placeholder="ค้นหาเวิร์กสเปซหรือเจ้าของ" />
          <select name="status" defaultValue={params.status ?? ""} className={adminFilterSmallFieldClass}>
            <option value="">ทุกสถานะ</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>
          <select name="health" defaultValue={params.health ?? ""} className={adminFilterSmallFieldClass}>
            <option value="">ทุกสุขภาพ</option>
            <option value="HEALTHY">HEALTHY</option>
            <option value="WATCH">WATCH</option>
            <option value="RISK">RISK</option>
          </select>
          <input name="minScore" type="number" min="0" max="100" defaultValue={params.minScore ?? ""} className={adminFilterSmallFieldClass} placeholder="คะแนนต่ำสุด" />
          <input name="maxScore" type="number" min="0" max="100" defaultValue={params.maxScore ?? ""} className={adminFilterSmallFieldClass} placeholder="คะแนนสูงสุด" />
          <select name="pageSize" defaultValue={params.pageSize ?? "20"} className={adminFilterSmallFieldClass}>
            <option value="20">20/หน้า</option>
            <option value="50">50/หน้า</option>
            <option value="100">100/หน้า</option>
          </select>
          <button className={adminFilterButtonClass}>กรอง</button>
        </form>
      </AdminFilterDropdown>
      <section className="grid gap-3 md:grid-cols-3">
        <Metric label="ปกติ" value={result.data.summary.healthy} tone="emerald" />
        <Metric label="ต้องเฝ้าดู" value={result.data.summary.watch} tone="amber" />
        <Metric label="เสี่ยง" value={result.data.summary.risk} tone="red" />
      </section>
      <div className="max-w-full overflow-x-auto rounded-2xl bg-white shadow-sm">
        <table className="w-full min-w-[1080px] text-sm">
          <thead className="bg-slate-50 text-left text-slate-500"><tr><th className="p-3">เวิร์กสเปซ</th><th className="p-3">คะแนน</th><th className="p-3">เจ้าของ</th><th className="p-3">กิจกรรม</th><th className="p-3">สมาชิก</th><th className="p-3">ยอดค้าง</th><th className="p-3">ความเสี่ยง</th></tr></thead>
          <tbody>
            {result.data.rows.map((workspace) => (
              <tr className="border-t border-slate-100 align-top" key={workspace.id}>
                <td className="p-3"><p className="font-black text-slate-950">{workspace.name}</p><p className="text-xs text-slate-500">{workspace.status}</p></td>
                <td className="p-3"><HealthPill score={workspace.score} label={workspace.statusLabel} /></td>
                <td className="p-3">{workspace.owner.fullName || workspace.owner.username}<p className="text-xs text-slate-400">{workspace.owner.status}</p></td>
                <td className="p-3 text-xs text-slate-500">{workspace.lastActivityAt ? formatThaiDateTime(workspace.lastActivityAt) : "ไม่พบกิจกรรม"}<p>{workspace.inactiveDays} วัน</p></td>
                <td className="p-3">{workspace._count.members.toLocaleString("th-TH")} / {workspace.maxMembers.toLocaleString("th-TH")}</td>
                <td className="p-3">{formatMoney(workspace.outstanding.amount)}<p className="text-xs text-slate-400">{workspace.outstanding.count.toLocaleString("th-TH")} รายการ</p></td>
                <td className="p-3"><div className="flex flex-wrap gap-1">{workspace.risks.length ? workspace.risks.map((risk) => <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-black text-amber-700" key={risk}>{risk}</span>) : <span className="text-slate-400">ไม่มี</span>}</div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <AdminPagination basePath="/admin/health" params={params} pagination={result.data.pagination} />
    </div>
  );
}

function Header({ title, description }: { title: string; description: string }) {
  return <div><h1 className="text-2xl font-black text-slate-950">{title}</h1><p className="mt-1 text-sm text-slate-500">{description}</p></div>;
}
function Metric({ label, value, tone }: { label: string; value: number; tone: "emerald" | "amber" | "red" }) {
  const cls = tone === "emerald" ? "text-emerald-700" : tone === "amber" ? "text-amber-700" : "text-red-700";
  return <div className="rounded-2xl bg-white p-4 shadow-sm"><p className="text-sm font-semibold text-slate-500">{label}</p><p className={`mt-2 text-2xl font-black ${cls}`}>{value.toLocaleString("th-TH")}</p></div>;
}
function HealthPill({ score, label }: { score: number; label: string }) {
  const cls = score >= 80 ? "bg-emerald-50 text-emerald-700" : score >= 55 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${cls}`}>{label} {score}</span>;
}
