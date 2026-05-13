import { AppLayout } from "@/components/layout/AppLayout";
import { RoleGate } from "@/components/layout/RoleGate";
import { getUnpaidAndPartialPaymentsAction } from "@/features/payments/actions";
import { RoundMemberList } from "@/features/rounds/components/RoundMemberList";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function OverduePage() {
  const result = await getUnpaidAndPartialPaymentsAction();
  const rows = result.success ? result.data : [];
  return (
    <AppLayout>
      <RoleGate allowedRoles={["OWNER", "ADMIN", "COLLECTOR"]}>
        <div className="grid gap-5">
        <div>
          <h2 className="text-2xl font-bold text-slate-950">คนค้างจ่าย</h2>
          <p className="text-sm text-slate-500">รวม UNPAID, PARTIAL, OVERDUE และ PARTIAL_OVERDUE</p>
        </div>
        {rows.length ? <RoundMemberList memberRounds={rows} /> : <EmptyState title="ยังไม่มีคนค้างจ่าย" />}
        </div>
      </RoleGate>
    </AppLayout>
  );
}
