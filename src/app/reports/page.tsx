import { AppLayout } from "@/components/layout/AppLayout";
import { RoleGate } from "@/components/layout/RoleGate";
import { EmptyState } from "@/components/ui/EmptyState";
import { ReportDashboard } from "@/features/reports/components/ReportDashboard";
import { getReportDashboardAction } from "@/features/reports/actions";

function parseDate(value?: string | string[]) {
  if (Array.isArray(value)) return undefined;
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const report = await getReportDashboardAction({
    ...params,
    from: Array.isArray(params.from) ? params.from[0] : params.from,
    to: Array.isArray(params.to) ? params.to[0] : params.to,
    q: Array.isArray(params.q) ? params.q[0] : params.q,
    roundId: Array.isArray(params.roundId) ? params.roundId[0] : params.roundId,
    paymentMethodId: Array.isArray(params.paymentMethodId) ? params.paymentMethodId[0] : params.paymentMethodId,
    collectedById: Array.isArray(params.collectedById) ? params.collectedById[0] : params.collectedById,
    minAmount: Array.isArray(params.minAmount) ? params.minAmount[0] : params.minAmount,
    maxAmount: Array.isArray(params.maxAmount) ? params.maxAmount[0] : params.maxAmount,
    page: Array.isArray(params.page) ? params.page[0] : params.page,
    pageSize: Array.isArray(params.pageSize) ? params.pageSize[0] : params.pageSize,
    startDate: parseDate(params.from),
    endDate: parseDate(params.to),
  });

  return (
    <AppLayout>
      <RoleGate allowedRoles={["OWNER", "ADMIN", "COLLECTOR", "VIEWER"]}>
        {report.success ? <ReportDashboard report={report.data} /> : <EmptyState title={report.message} />}
      </RoleGate>
    </AppLayout>
  );
}
