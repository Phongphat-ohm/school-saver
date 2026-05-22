import { EmptyState } from "@/components/ui/EmptyState";
import { getAdminAuditSecurityCenterAction } from "@/features/admin/actions";
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

export default async function AdminAuditPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const result = await getAdminAuditSecurityCenterAction(params);
  if (!result.success) return <EmptyState title="ไม่สามารถดึงข้อมูลความปลอดภัยได้" description={result.message} />;

  return (
    <div className="grid gap-5">
      <Header title="ศูนย์ตรวจสอบและความปลอดภัย" description="ตรวจจับการเข้าสู่ระบบผิดปกติ การรีเซ็ตรหัสผ่าน การเปลี่ยนสิทธิ์ support mode การ export และเหตุการณ์เสี่ยง" />
      <section className="grid gap-3 md:grid-cols-5">
        <Metric label="ล็อกอินไม่สำเร็จ 24 ชม." value={result.data.metrics.failedLogins} tone="amber" />
        <Metric label="ถูกบล็อก 24 ชม." value={result.data.metrics.blockedEvents} tone="red" />
        <Metric label="บันทึก support" value={result.data.metrics.supportEntries} tone="blue" />
        <Metric label="รีเซ็ตรหัสผ่าน" value={result.data.metrics.resetEvents} tone="slate" />
        <Metric label="เปลี่ยนสิทธิ์" value={result.data.metrics.roleEvents} tone="slate" />
      </section>
      {result.data.riskAlerts.length ? (
        <section className="grid gap-2">
          {result.data.riskAlerts.map((alert) => (
            <div className={`rounded-2xl border p-3 ${alert.level === "HIGH" ? "border-red-100 bg-red-50 text-red-800" : "border-amber-100 bg-amber-50 text-amber-800"}`} key={alert.label}>
              <p className="font-black">{alert.label}</p>
              <p className="text-sm">{alert.detail}</p>
            </div>
          ))}
        </section>
      ) : null}
      <AdminFilterDropdown activeCount={countActiveFilters(params)} description="กรองเหตุการณ์ความปลอดภัยตามผู้ใช้ IP เวิร์กสเปซ วันที่ และระดับความเสี่ยง" resetHref="/admin/audit">
        <form className={adminFilterFormClass}>
          <input name="page" type="hidden" value="1" />
          <input name="q" defaultValue={params.q ?? ""} className={adminFilterSearchClass} placeholder="ค้นหา action/detail/path" />
          <input name="ip" defaultValue={params.ip ?? ""} className={adminFilterSmallFieldClass} placeholder="IP" />
          <select name="severity" defaultValue={params.severity ?? ""} className={adminFilterSmallFieldClass}>
            <option value="">ทุกระดับ</option>
            <option value="RISK">เฉพาะเสี่ยง</option>
          </select>
          <select name="workspaceId" defaultValue={params.workspaceId ?? ""} className={adminFilterFieldClass}>
            <option value="">ทุก workspace</option>
            {result.data.workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}
          </select>
          <select name="userId" defaultValue={params.userId ?? ""} className={adminFilterFieldClass}>
            <option value="">ทุก user</option>
            {result.data.users.map((user) => <option key={user.id} value={user.id}>{user.fullName} ({user.username})</option>)}
          </select>
          <input name="from" type="date" defaultValue={params.from ?? ""} className={adminFilterSmallFieldClass} />
          <input name="to" type="date" defaultValue={params.to ?? ""} className={adminFilterSmallFieldClass} />
          <button className={adminFilterButtonClass}>กรอง</button>
        </form>
      </AdminFilterDropdown>
      <div className="max-w-full overflow-x-auto rounded-2xl bg-white shadow-sm">
        <table className="w-full min-w-[1040px] text-sm">
          <thead className="bg-slate-50 text-left text-slate-500"><tr><th className="p-3">เวลา</th><th className="p-3">การกระทำ</th><th className="p-3">ผลลัพธ์</th><th className="p-3">ผู้ใช้</th><th className="p-3">เวิร์กสเปซ</th><th className="p-3">IP / Path</th><th className="p-3">รายละเอียด</th></tr></thead>
          <tbody>
            {result.data.events.map((event) => (
              <tr className="border-t border-slate-100 align-top" key={event.id}>
                <td className="whitespace-nowrap p-3">{formatThaiDateTime(event.createdAt)}</td>
                <td className="p-3 font-black text-slate-950">{event.action}</td>
                <td className="p-3"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-700">{event.outcome}</span></td>
                <td className="p-3">{event.user?.fullName ?? "ระบบ"}</td>
                <td className="p-3">{event.workspace?.name ?? "ทั้งแพลตฟอร์ม"}</td>
                <td className="p-3 text-xs text-slate-500"><p>{event.ipAddress ?? "ไม่มี IP"}</p><p className="max-w-[220px] truncate">{event.path ?? "-"}</p></td>
                <td className="max-w-[360px] p-3 text-slate-600">{event.detail ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <AdminPagination basePath="/admin/audit" params={params} pagination={result.data.pagination} />
    </div>
  );
}

function Header({ title, description }: { title: string; description: string }) {
  return <div><h1 className="text-2xl font-black text-slate-950">{title}</h1><p className="mt-1 text-sm text-slate-500">{description}</p></div>;
}

function Metric({ label, value, tone }: { label: string; value: number; tone: "red" | "amber" | "blue" | "slate" }) {
  const cls = tone === "red" ? "text-red-700" : tone === "amber" ? "text-amber-700" : tone === "blue" ? "text-blue-700" : "text-slate-950";
  return <div className="rounded-2xl bg-white p-4 shadow-sm"><p className="text-sm font-semibold text-slate-500">{label}</p><p className={`mt-2 text-2xl font-black ${cls}`}>{value.toLocaleString("th-TH")}</p></div>;
}
