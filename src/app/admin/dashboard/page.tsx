import { EmptyState } from "@/components/ui/EmptyState";
import { getSuperAdminOverviewAction } from "@/features/admin/actions";
import { SuperAdminDashboard } from "@/features/admin/components/SuperAdminDashboard";

export default async function AdminDashboardPage() {
  const result = await getSuperAdminOverviewAction();

  if (!result.success) {
    return (
      <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
        <EmptyState title="ไม่สามารถดึงข้อมูลแดชบอร์ดกลางได้" description={result.message} />
      </div>
    );
  }

  return <SuperAdminDashboard overview={result.data} />;
}
