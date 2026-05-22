import { EmptyState } from "@/components/ui/EmptyState";
import { getAdminPlatformControlsAction } from "@/features/admin/actions";
import {
  AdminFilterDropdown,
  adminFilterButtonClass,
  adminFilterFormClass,
  adminFilterSearchClass,
  adminFilterSmallFieldClass,
  countActiveFilters,
} from "@/features/admin/components/AdminFilterDropdown";
import { AdminPagination } from "@/features/admin/components/AdminPagination";
import { PlatformSettingForm, WorkspaceFeatureFlagToggle, WorkspaceLimitForm } from "@/features/admin/components/AdminClientControls";

export default async function AdminPlatformControlsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const result = await getAdminPlatformControlsAction(params);
  if (!result.success) return <EmptyState title="ไม่สามารถดึงการตั้งค่าแพลตฟอร์มได้" description={result.message} />;

  return (
    <div className="grid gap-5">
      <Header title="ลิมิตและฟีเจอร์ของแพลตฟอร์ม" description="ตั้งค่าระดับระบบ ลิมิตต่อเวิร์กสเปซ และเปิด/ปิดฟีเจอร์เฉพาะเวิร์กสเปซ" />
      <AdminFilterDropdown activeCount={countActiveFilters(params)} description="ค้นหาเวิร์กสเปซ/เจ้าของ และแบ่งหน้ารายการลิมิต/ฟีเจอร์" resetHref="/admin/platform">
        <form className={adminFilterFormClass}>
          <input name="page" type="hidden" value="1" />
          <input name="q" defaultValue={params.q ?? ""} className={adminFilterSearchClass} placeholder="ค้นหาเวิร์กสเปซหรือเจ้าของ" />
          <select name="status" defaultValue={params.status ?? ""} className={adminFilterSmallFieldClass}>
            <option value="">ทุกสถานะ</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>
          <select name="pageSize" defaultValue={params.pageSize ?? "20"} className={adminFilterSmallFieldClass}>
            <option value="20">20/หน้า</option>
            <option value="50">50/หน้า</option>
            <option value="100">100/หน้า</option>
          </select>
          <button className={adminFilterButtonClass}>กรอง</button>
        </form>
      </AdminFilterDropdown>
      <section className="grid gap-3">
        {result.data.settings.map((setting) => <PlatformSettingForm key={setting.key} setting={setting} />)}
      </section>
      <section className="max-w-full overflow-x-auto rounded-2xl bg-white shadow-sm">
        <table className="w-full min-w-[1080px] text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr><th className="p-3">เวิร์กสเปซ</th><th className="p-3">การใช้งาน</th>{result.data.defaultWorkspaceLimits.map((limit) => <th className="p-3" key={limit.key}>{limit.key}</th>)}{result.data.defaultFeatureFlags.map((flag) => <th className="p-3" key={flag}>{flag}</th>)}</tr>
          </thead>
          <tbody>
            {result.data.workspaces.map((workspace) => (
              <tr className="border-t border-slate-100 align-top" key={workspace.id}>
                <td className="p-3"><p className="font-black text-slate-950">{workspace.name}</p><p className="text-xs text-slate-500">{workspace.status}</p></td>
                <td className="p-3 text-xs text-slate-500"><p>สมาชิก {workspace._count.members}</p><p>ผู้ใช้ {workspace._count.workspaceMembers}</p><p>รอบ {workspace._count.rounds}</p></td>
                {result.data.defaultWorkspaceLimits.map((limit) => {
                  const current = workspace.limits.find((item) => item.key === limit.key)?.value ?? limit.value;
                  return <td className="p-3" key={limit.key}><WorkspaceLimitForm workspaceId={workspace.id} limitKey={limit.key} value={current} /></td>;
                })}
                {result.data.defaultFeatureFlags.map((flag) => {
                  const enabled = workspace.featureFlags.find((item) => item.key === flag)?.enabled ?? false;
                  return <td className="p-3" key={flag}><WorkspaceFeatureFlagToggle workspaceId={workspace.id} flagKey={flag} enabled={enabled} /></td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <AdminPagination basePath="/admin/platform" params={params} pagination={result.data.pagination} />
    </div>
  );
}

function Header({ title, description }: { title: string; description: string }) {
  return <div><h1 className="text-2xl font-black text-slate-950">{title}</h1><p className="mt-1 text-sm text-slate-500">{description}</p></div>;
}
