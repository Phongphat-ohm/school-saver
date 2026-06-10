import { AppLayout } from "@/components/layout/AppLayout";
import { RoleGate } from "@/components/layout/RoleGate";
import { EmptyState } from "@/components/ui/EmptyState";
import { getPaymentMethodsAction } from "@/features/payment-methods/actions";
import { OutstandingMembersExportPanel } from "@/features/payments/components/OutstandingMembersExportPanel";
import { getUnpaidAndPartialPaymentsAction } from "@/features/payments/actions";
import { getOutstandingMembersReportAction } from "@/features/reports/actions";
import { RoundMemberList } from "@/features/rounds/components/RoundMemberList";

export default async function OverduePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const [result, methodsResult, reportResult] = await Promise.all([
    getUnpaidAndPartialPaymentsAction(),
    getPaymentMethodsAction(),
    getOutstandingMembersReportAction({
      q: params.q,
      roundId: params.roundId,
      status: params.status,
      roundScope: params.roundScope,
    }),
  ]);
  const rows = result.success ? result.data : [];
  const methods = methodsResult.success ? methodsResult.data : [];

  return (
    <AppLayout>
      <RoleGate allowedRoles={["OWNER", "ADMIN", "COLLECTOR"]}>
        <div className="grid gap-5">
          <div>
            <h2 className="text-2xl font-bold text-slate-950">คนค้างจ่าย</h2>
            <p className="text-sm text-slate-500">รวม UNPAID, PARTIAL, OVERDUE และ PARTIAL_OVERDUE พร้อมรับชำระได้ทันที</p>
          </div>
          {reportResult.success ? <OutstandingMembersExportPanel report={reportResult.data} /> : null}
          {rows.length ? <RoundMemberList memberRounds={rows} paymentMethods={methods} /> : <EmptyState title="ยังไม่มีคนค้างจ่าย" />}
        </div>
      </RoleGate>
    </AppLayout>
  );
}
