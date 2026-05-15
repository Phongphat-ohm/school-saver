import { AppLayout } from "@/components/layout/AppLayout";
import { RoleGate } from "@/components/layout/RoleGate";
import { EmptyState } from "@/components/ui/EmptyState";
import { ReportDashboard } from "@/features/reports/components/ReportDashboard";
import { getReportDashboardAction } from "@/features/reports/actions";

function parseDate(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const { from, to } = await searchParams;
  const report = await getReportDashboardAction(parseDate(from), parseDate(to));

  return (
    <AppLayout>
      <RoleGate allowedRoles={["OWNER", "ADMIN", "COLLECTOR", "VIEWER"]}>
        {report.success ? <ReportDashboard report={report.data} /> : <EmptyState title={report.message} />}
      </RoleGate>
    </AppLayout>
  );
}
