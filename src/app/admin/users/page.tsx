import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { getAdminUsersAction } from "@/features/admin/actions";
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

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const result = await getAdminUsersAction(params);
  if (!result.success) return <EmptyState title="ไม่สามารถดึงข้อมูลผู้ใช้ได้" description={result.message} />;
  const activeFilters = countActiveFilters(params);

  return (
    <div className="grid gap-5">
      <Header
        title="จัดการผู้ใช้"
        description="ค้นหาและคัดกรองผู้ใช้ทั้งหมด หน้านี้แสดงเฉพาะข้อมูลสำคัญ กดดูรายละเอียดเพื่อจัดการบัญชี สิทธิ์เวิร์กสเปซ ประวัติธุรกรรม และเหตุการณ์ความปลอดภัย"
      />

      <AdminFilterDropdown activeCount={activeFilters} description="ค้นหาผู้ใช้ตามชื่อ อีเมล สถานะ สิทธิ์ และจำนวนเวิร์กสเปซ" resetHref="/admin/users">
        <form className={adminFilterFormClass}>
          <input name="page" type="hidden" value="1" />
          <input name="q" defaultValue={params.q ?? ""} className={adminFilterSearchClass} placeholder="ค้นหา username/email/ชื่อ" />
          <select name="status" defaultValue={params.status ?? ""} className={adminFilterSmallFieldClass}>
            <option value="">ทุกสถานะ</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>
          <select name="role" defaultValue={params.role ?? ""} className={adminFilterSmallFieldClass}>
            <option value="">ทุกสิทธิ์</option>
            <option value="USER">USER</option>
            <option value="SUPER_ADMIN">SUPER_ADMIN</option>
          </select>
          <input name="minWorkspaces" type="number" min="0" defaultValue={params.minWorkspaces ?? ""} className={adminFilterSmallFieldClass} placeholder="WS ต่ำสุด" />
          <input name="maxWorkspaces" type="number" min="0" defaultValue={params.maxWorkspaces ?? ""} className={adminFilterSmallFieldClass} placeholder="WS สูงสุด" />
          <select name="pageSize" defaultValue={params.pageSize ?? "20"} className={adminFilterSmallFieldClass}>
            <option value="20">20/หน้า</option>
            <option value="50">50/หน้า</option>
            <option value="100">100/หน้า</option>
          </select>
          <button className={adminFilterButtonClass}>ค้นหา</button>
        </form>
      </AdminFilterDropdown>

      <div className="max-w-full overflow-x-auto rounded-2xl bg-white shadow-sm">
        <table className="w-full min-w-[920px] text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="p-3">ผู้ใช้</th>
              <th className="p-3">สถานะ</th>
              <th className="p-3">สิทธิ์</th>
              <th className="p-3 text-right">เวิร์กสเปซ</th>
              <th className="p-3 text-right">บันทึก</th>
              <th className="p-3">กิจกรรมล่าสุด</th>
              <th className="p-3 text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {result.data.rows.map((user) => {
              const latestLog = user.activityLogs[0];

              return (
                <tr className="border-t border-slate-100 align-top" key={user.id}>
                  <td className="p-3">
                    <p className="font-black text-slate-950">{user.fullName}</p>
                    <p className="text-xs text-slate-500">
                      {user.username}
                      {user.email ? ` · ${user.email}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">สร้าง {formatThaiDateTime(user.createdAt)}</p>
                  </td>
                  <td className="p-3">
                    <Pill tone={user.status === "ACTIVE" ? "emerald" : "rose"}>{user.status}</Pill>
                  </td>
                  <td className="p-3">
                    <Pill tone={user.role === "SUPER_ADMIN" ? "blue" : "slate"}>{user.role}</Pill>
                  </td>
                  <td className="p-3 text-right font-bold">{user._count.workspaceMemberships.toLocaleString("th-TH")}</td>
                  <td className="p-3 text-right">{user._count.activityLogs.toLocaleString("th-TH")}</td>
                  <td className="max-w-[320px] p-3 text-xs text-slate-600">
                    {latestLog ? (
                      <>
                        <p className="truncate font-semibold text-slate-800">{latestLog.action}</p>
                        <p className="text-slate-400">
                          {latestLog.outcome} · {formatThaiDateTime(latestLog.createdAt)}
                        </p>
                      </>
                    ) : (
                      <p className="text-slate-400">ยังไม่มีบันทึก</p>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end">
                      <Link
                        className="inline-flex min-h-9 items-center justify-center rounded-xl bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-900 shadow-sm transition hover:bg-slate-200"
                        href={`/admin/users/${user.id}`}
                      >
                        ดู / จัดการ
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!result.data.rows.length ? <div className="p-6 text-center text-sm font-semibold text-slate-400">ไม่พบผู้ใช้ตามเงื่อนไข</div> : null}
      </div>

      <AdminPagination basePath="/admin/users" params={params} pagination={result.data.pagination} />
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

function Pill({ children, tone }: { children: React.ReactNode; tone: "emerald" | "rose" | "blue" | "slate" }) {
  const cls = { emerald: "bg-emerald-50 text-emerald-700", rose: "bg-rose-50 text-rose-700", blue: "bg-blue-50 text-blue-700", slate: "bg-slate-100 text-slate-700" }[tone];
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${cls}`}>{children}</span>;
}
