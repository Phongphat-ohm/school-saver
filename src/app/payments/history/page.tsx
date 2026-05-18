import { AppLayout } from "@/components/layout/AppLayout";
import { RoleGate } from "@/components/layout/RoleGate";
import { EmptyState } from "@/components/ui/EmptyState";
import { getPaymentMethodsAction } from "@/features/payment-methods/actions";
import { getPaymentHistoryAction } from "@/features/payments/actions";
import { PaymentHistory } from "@/features/payments/components/PaymentHistory";
import { getCollectionRoundsAction } from "@/features/rounds/actions";

export default async function PaymentHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ roundId?: string; member?: string; startDate?: string; endDate?: string }>;
}) {
  const filters = await searchParams;
  const [historyResult, roundsResult, methodsResult] = await Promise.all([
    getPaymentHistoryAction(filters),
    getCollectionRoundsAction(),
    getPaymentMethodsAction(),
  ]);

  const rounds = roundsResult.success ? roundsResult.data : [];
  const paymentMethods = methodsResult.success ? methodsResult.data : [];

  return (
    <AppLayout>
      <RoleGate allowedRoles={["OWNER", "ADMIN", "COLLECTOR"]}>
        <div className="grid gap-5">
          <div>
            <h2 className="text-2xl font-bold text-slate-950">ประวัติการชำระเงิน</h2>
            <p className="text-sm text-slate-500">กรอง แก้ไข และลบรายการชำระเงินแยกตามรอบเก็บเงิน</p>
          </div>
          {historyResult.success ? (
            <PaymentHistory transactions={historyResult.data} rounds={rounds} paymentMethods={paymentMethods} filters={filters} />
          ) : (
            <EmptyState title="ไม่สามารถโหลดประวัติการชำระเงินได้" description={historyResult.message} />
          )}
        </div>
      </RoleGate>
    </AppLayout>
  );
}
