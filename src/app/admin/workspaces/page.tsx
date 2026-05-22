import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { getAdminWorkspacesAction } from "@/features/admin/actions";
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

export default async function AdminWorkspacesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const result = await getAdminWorkspacesAction(params);

  if (!result.success) return <EmptyState title="ไม่สามารถดึง workspace ได้" description={result.message} />;
  const activeFilters = countActiveFilters(params);

  return (
    <div className="grid gap-5">
      <Header title="จัดการเวิร์กสเปซ" description="ค้นหาเวิร์กสเปซและดูสุขภาพเบื้องต้น รายละเอียดเชิงลึกและคำสั่งสำคัญอยู่ในหน้าจัดการของแต่ละเวิร์กสเปซ" />

      <AdminFilterDropdown activeCount={activeFilters} description="ค้นหาเวิร์กสเปซตามเจ้าของ สถานะ วันที่สร้าง จำนวนสมาชิก และยอดค้าง" resetHref="/admin/workspaces">
        <form className={adminFilterFormClass}>
          <input name="page" type="hidden" value="1" />
          <input name="q" defaultValue={params.q ?? ""} className={adminFilterSearchClass} placeholder="ค้นหาเวิร์กสเปซหรือเจ้าของ" />
          <select name="status" defaultValue={params.status ?? ""} className={adminFilterSmallFieldClass}>
            <option value="">ทุกสถานะ</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>
          <input name="from" type="date" defaultValue={params.from ?? ""} className={adminFilterSmallFieldClass} />
          <input name="to" type="date" defaultValue={params.to ?? ""} className={adminFilterSmallFieldClass} />
          <input name="minMembers" type="number" min="0" defaultValue={params.minMembers ?? ""} className={adminFilterSmallFieldClass} placeholder="สมาชิกต่ำสุด" />
          <input name="maxMembers" type="number" min="0" defaultValue={params.maxMembers ?? ""} className={adminFilterSmallFieldClass} placeholder="สมาชิกสูงสุด" />
          <input name="minOutstanding" type="number" min="0" step="0.01" defaultValue={params.minOutstanding ?? ""} className={adminFilterSmallFieldClass} placeholder="ค้างต่ำสุด" />
          <input name="maxOutstanding" type="number" min="0" step="0.01" defaultValue={params.maxOutstanding ?? ""} className={adminFilterSmallFieldClass} placeholder="ค้างสูงสุด" />
          <select name="pageSize" defaultValue={params.pageSize ?? "20"} className={adminFilterSmallFieldClass}>
            <option value="20">20/หน้า</option>
            <option value="50">50/หน้า</option>
            <option value="100">100/หน้า</option>
          </select>
          <button className={adminFilterButtonClass}>ค้นหา</button>
        </form>
      </AdminFilterDropdown>

      <div className="max-w-full overflow-x-auto rounded-2xl bg-white shadow-sm">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="p-3">เวิร์กสเปซ</th>
              <th className="p-3">เจ้าของ</th>
              <th className="p-3 text-right">ผู้ใช้</th>
              <th className="p-3 text-right">สมาชิก</th>
              <th className="p-3 text-right">ชำระแล้ว</th>
              <th className="p-3 text-right">ยอดค้าง</th>
              <th className="p-3">สุขภาพ</th>
              <th className="p-3 text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {result.data.rows.map((workspace) => (
              <tr className="border-t border-slate-100 align-top" key={workspace.id}>
                <td className="p-3">
                  <p className="font-black text-slate-950">{workspace.name}</p>
                  <p className="mt-1 text-xs text-slate-400">สร้าง {formatThaiDateTime(workspace.createdAt)}</p>
                  <Pill tone={workspace.status === "ACTIVE" ? "emerald" : "rose"}>{workspace.status}</Pill>
                </td>
                <td className="p-3">
                  <p className="font-semibold text-slate-800">{workspace.owner.fullName}</p>
                  <p className="text-xs text-slate-400">{workspace.owner.username}</p>
                </td>
                <td className="p-3 text-right font-bold">{workspace._count.workspaceMembers.toLocaleString("th-TH")}</td>
                <td className="p-3 text-right font-bold">{workspace._count.members.toLocaleString("th-TH")}</td>
                <td className="p-3 text-right">{formatMoney(workspace.payments.amount)}</td>
                <td className="p-3 text-right font-bold text-rose-700">{formatMoney(workspace.outstanding.amount)}</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    {workspace.health.noRecentActivity ? <Pill tone="amber">ไม่ค่อยใช้งาน</Pill> : <Pill tone="emerald">ปกติ</Pill>}
                    {workspace.health.highOutstanding ? <Pill tone="rose">ยอดค้างสูง</Pill> : null}
                  </div>
                  <p className="mt-2 text-xs text-slate-400">ล่าสุด {workspace.lastActivityAt ? formatThaiDateTime(workspace.lastActivityAt) : "ไม่มี"}</p>
                </td>
                <td className="p-3">
                  <div className="flex justify-end">
                    <Link
                      className="inline-flex min-h-9 items-center justify-center rounded-xl bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-900 shadow-sm transition hover:bg-slate-200"
                      href={`/admin/workspaces/${workspace.id}`}
                    >
                      ดู / จัดการ
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!result.data.rows.length ? <div className="p-6 text-center text-sm font-semibold text-slate-400">ไม่พบ workspace ตามเงื่อนไข</div> : null}
      </div>

      <AdminPagination basePath="/admin/workspaces" params={params} pagination={result.data.pagination} />
    </div>
  );
}

function Header({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h1 className="text-2xl font-black text-slate-950">{title}</h1>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function Pill({ children, tone }: { children: React.ReactNode; tone: "emerald" | "rose" | "amber" }) {
  const cls = { emerald: "bg-emerald-50 text-emerald-700", rose: "bg-rose-50 text-rose-700", amber: "bg-amber-50 text-amber-700" }[tone];
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${cls}`}>{children}</span>;
}
