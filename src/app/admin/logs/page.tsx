import { EmptyState } from "@/components/ui/EmptyState";
import { getAdminLogsAction } from "@/features/admin/actions";
import { ExportXlsxButton } from "@/features/admin/components/AdminClientControls";
import {
  AdminFilterDropdown,
  adminFilterButtonClass,
  adminFilterFieldClass,
  adminFilterFormClass,
  adminFilterSearchClass,
  adminFilterSmallFieldClass,
  countActiveFilters,
} from "@/features/admin/components/AdminFilterDropdown";
import { AdminPagination } from "@/features/admin/components/AdminPagination";
import { formatThaiDateTime } from "@/lib/date";

export default async function AdminLogsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const result = await getAdminLogsAction(params);
  if (!result.success) return <EmptyState title="ไม่สามารถดึงบันทึกกิจกรรมได้" description={result.message} />;
  const activeFilters = countActiveFilters(params);

  const rows = result.data.logs.map((log) => ({
    action: log.action,
    outcome: log.outcome,
    workspace: log.workspace?.name ?? "ทั้งแพลตฟอร์ม",
    user: log.user?.fullName ?? "ระบบ",
    ip: log.ipAddress ?? "",
    path: log.path ?? "",
    detail: log.detail ?? "",
    createdAt: formatThaiDateTime(log.createdAt),
  }));

  return (
    <div className="grid gap-5">
      <Header title="บันทึกกิจกรรมและความปลอดภัย" description="ค้นหาและกรองบันทึกกิจกรรม/เหตุการณ์ความปลอดภัยตามผู้ใช้ เวิร์กสเปซ การกระทำ IP ผลลัพธ์ และวันที่" />

      <AdminFilterDropdown activeCount={activeFilters} description="ค้นหาบันทึกตาม action, detail, IP, ผู้ใช้, เวิร์กสเปซ, ผลลัพธ์ และวันที่" resetHref="/admin/logs">
        <form className={adminFilterFormClass}>
          <input name="page" type="hidden" value="1" />
          <input name="q" defaultValue={params.q ?? ""} className={adminFilterSearchClass} placeholder="ค้นหา action/detail/IP/path" />
          <select name="workspaceId" defaultValue={params.workspaceId ?? ""} className={adminFilterFieldClass}>
            <option value="">ทุกเวิร์กสเปซ</option>
            {result.data.workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}
          </select>
          <select name="userId" defaultValue={params.userId ?? ""} className={adminFilterFieldClass}>
            <option value="">ทุกผู้ใช้</option>
            {result.data.users.map((user) => <option key={user.id} value={user.id}>{user.fullName} ({user.username})</option>)}
          </select>
          <select name="outcome" defaultValue={params.outcome ?? ""} className={adminFilterSmallFieldClass}>
            <option value="">ทุกผลลัพธ์</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="FAILURE">FAILURE</option>
          </select>
          <input name="from" type="date" defaultValue={params.from ?? ""} className={adminFilterSmallFieldClass} />
          <input name="to" type="date" defaultValue={params.to ?? ""} className={adminFilterSmallFieldClass} />
          <select name="pageSize" defaultValue={params.pageSize ?? "20"} className={adminFilterSmallFieldClass}>
            <option value="20">20/หน้า</option>
            <option value="50">50/หน้า</option>
            <option value="100">100/หน้า</option>
          </select>
          <button className={adminFilterButtonClass}>กรอง</button>
        </form>
      </AdminFilterDropdown>

      <div className="flex justify-end"><ExportXlsxButton filename="super-admin-activity-logs.xlsx" rows={rows} /></div>

      <div className="max-w-full overflow-x-auto rounded-2xl bg-white shadow-sm">
        <table className="w-full min-w-[1040px] text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="p-3">เวลา</th>
              <th className="p-3">การกระทำ</th>
              <th className="p-3">ผลลัพธ์</th>
              <th className="p-3">เวิร์กสเปซ</th>
              <th className="p-3">ผู้ใช้</th>
              <th className="p-3">IP / Path</th>
              <th className="p-3">รายละเอียด</th>
            </tr>
          </thead>
          <tbody>
            {result.data.logs.map((log) => (
              <tr className="border-t border-slate-100 align-top" key={log.id}>
                <td className="p-3 whitespace-nowrap">{formatThaiDateTime(log.createdAt)}</td>
                <td className="p-3 font-black text-slate-950">{log.action}</td>
                <td className="p-3"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-700">{log.outcome}</span></td>
                <td className="p-3">{log.workspace?.name ?? "ทั้งแพลตฟอร์ม"}</td>
                <td className="p-3">{log.user?.fullName ?? "ระบบ"}</td>
                <td className="p-3 text-xs text-slate-500"><p>{log.ipAddress ?? "ไม่มี IP"}</p><p className="max-w-[220px] truncate">{log.path ?? "-"}</p></td>
                <td className="max-w-[340px] p-3 text-slate-600">{log.detail ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!result.data.logs.length ? <div className="p-6 text-center text-sm font-semibold text-slate-400">ไม่พบบันทึกตามเงื่อนไข</div> : null}
      </div>

      <AdminPagination basePath="/admin/logs" params={params} pagination={result.data.pagination} />
    </div>
  );
}

function Header({ title, description }: { title: string; description: string }) {
  return <div><h1 className="text-2xl font-black text-slate-950">{title}</h1><p className="mt-1 text-sm text-slate-500">{description}</p></div>;
}
