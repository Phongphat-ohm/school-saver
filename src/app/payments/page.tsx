import { AppLayout } from "@/components/layout/AppLayout";
import { RoleGate } from "@/components/layout/RoleGate";
import { getCollectionRoundsAction } from "@/features/rounds/actions";
import { PaymentRoundFilter } from "@/features/payments/components/PaymentRoundFilter";
import { PaymentSearch } from "@/features/payments/components/PaymentSearch";

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ member?: string; roundId?: string }> }) {
  const { member, roundId } = await searchParams;
  const roundsResult = await getCollectionRoundsAction();
  const rounds = roundsResult.success ? roundsResult.data : [];

  return (
    <AppLayout>
      <RoleGate allowedRoles={["OWNER", "ADMIN", "COLLECTOR"]}>
        <div className="grid gap-5">
        <div>
          <h2 className="text-2xl font-bold text-slate-950">รับชำระเงิน</h2>
          <p className="text-sm text-slate-500">แสดงสมาชิกที่ยังจ่ายไม่ครบใน workspace ปัจจุบัน</p>
        </div>
        <PaymentRoundFilter rounds={rounds} value={roundId} />
        <PaymentSearch memberCode={member} roundId={roundId} />
        </div>
      </RoleGate>
    </AppLayout>
  );
}
