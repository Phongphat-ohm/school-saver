import { EmptyState } from "@/components/ui/EmptyState";
import { getAdminBillingUsageAction } from "@/features/admin/actions";
import {
  AdminFilterDropdown,
  adminFilterButtonClass,
  adminFilterFormClass,
  adminFilterSearchClass,
  adminFilterSmallFieldClass,
  countActiveFilters,
} from "@/features/admin/components/AdminFilterDropdown";
import { AdminPagination } from "@/features/admin/components/AdminPagination";
import { formatMoney } from "@/lib/money";

export default async function AdminBillingUsagePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const result = await getAdminBillingUsageAction(params);
  if (!result.success) return <EmptyState title="ไม่สามารถดึงภาพรวมการใช้งานได้" description={result.message} />;

  return (
    <div className="grid gap-5">
      <Header title="ภาพรวมการใช้งานและแพ็กเกจ" description="ภาพรวมการใช้งานรายเดือนสำหรับรองรับแพ็กเกจและ billing ในอนาคต" />
      <AdminFilterDropdown activeCount={countActiveFilters(params)} description="ค้นหาเวิร์กสเปซ/เจ้าของ และกรองตามจำนวนสมาชิกหรือธุรกรรม พร้อมแบ่งหน้า" resetHref="/admin/billing">
        <form className={adminFilterFormClass}>
          <input name="page" type="hidden" value="1" />
          <input name="q" defaultValue={params.q ?? ""} className={adminFilterSearchClass} placeholder="ค้นหาเวิร์กสเปซหรือเจ้าของ" />
          <select name="status" defaultValue={params.status ?? ""} className={adminFilterSmallFieldClass}>
            <option value="">ทุกสถานะ</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>
          <input name="minMembers" type="number" min="0" defaultValue={params.minMembers ?? ""} className={adminFilterSmallFieldClass} placeholder="สมาชิกต่ำสุด" />
          <input name="maxMembers" type="number" min="0" defaultValue={params.maxMembers ?? ""} className={adminFilterSmallFieldClass} placeholder="สมาชิกสูงสุด" />
          <input name="minTransactions" type="number" min="0" defaultValue={params.minTransactions ?? ""} className={adminFilterSmallFieldClass} placeholder="ธุรกรรมต่ำสุด" />
          <input name="maxTransactions" type="number" min="0" defaultValue={params.maxTransactions ?? ""} className={adminFilterSmallFieldClass} placeholder="ธุรกรรมสูงสุด" />
          <select name="pageSize" defaultValue={params.pageSize ?? "20"} className={adminFilterSmallFieldClass}>
            <option value="20">20/หน้า</option>
            <option value="50">50/หน้า</option>
            <option value="100">100/หน้า</option>
          </select>
          <button className={adminFilterButtonClass}>กรอง</button>
        </form>
      </AdminFilterDropdown>
      <section className="grid gap-3 md:grid-cols-4">
        <Metric label="เวิร์กสเปซที่ใช้งาน" value={result.data.totals.activeWorkspaces.toLocaleString("th-TH")} />
        <Metric label="ผู้ใช้ที่ใช้งาน" value={result.data.totals.activeUsers.toLocaleString("th-TH")} />
        <Metric label="สมาชิกทั้งหมด" value={result.data.totals.members.toLocaleString("th-TH")} />
        <Metric label="ยอดชำระเดือนนี้" value={formatMoney(result.data.totals.monthlyPaidAmount)} />
      </section>
      <div className="max-w-full overflow-x-auto rounded-2xl bg-white shadow-sm">
        <table className="w-full min-w-[960px] text-sm">
          <thead className="bg-slate-50 text-left text-slate-500"><tr><th className="p-3">เวิร์กสเปซ</th><th className="p-3">แพ็กเกจ</th><th className="p-3">ผู้ใช้</th><th className="p-3">สมาชิก</th><th className="p-3">รอบ</th><th className="p-3">ธุรกรรมทั้งหมด</th><th className="p-3">เดือนนี้</th></tr></thead>
          <tbody>
            {result.data.workspaces.map((workspace) => (
              <tr className="border-t border-slate-100" key={workspace.id}>
                <td className="p-3"><p className="font-black text-slate-950">{workspace.name}</p><p className="text-xs text-slate-500">{workspace.owner.fullName || workspace.owner.username}</p></td>
                <td className="p-3"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-700">{workspace.plan}</span></td>
                <td className="p-3">{workspace._count.workspaceMembers.toLocaleString("th-TH")}</td>
                <td className="p-3">{workspace._count.members.toLocaleString("th-TH")}</td>
                <td className="p-3">{workspace._count.rounds.toLocaleString("th-TH")}</td>
                <td className="p-3">{workspace._count.paymentTransactions.toLocaleString("th-TH")}</td>
                <td className="p-3">{workspace.monthly.count.toLocaleString("th-TH")} รายการ<p className="text-xs text-slate-500">{formatMoney(workspace.monthly.amount)}</p></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <AdminPagination basePath="/admin/billing" params={params} pagination={result.data.pagination} />
    </div>
  );
}

function Header({ title, description }: { title: string; description: string }) {
  return <div><h1 className="text-2xl font-black text-slate-950">{title}</h1><p className="mt-1 text-sm text-slate-500">{description}</p></div>;
}
function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-white p-4 shadow-sm"><p className="text-sm font-semibold text-slate-500">{label}</p><p className="mt-2 text-xl font-black text-slate-950">{value}</p></div>;
}
