import { AppLayout } from "@/components/layout/AppLayout";
import { RoleGate } from "@/components/layout/RoleGate";
import { PaymentSearch } from "@/features/payments/components/PaymentSearch";

export default function PaymentsPage() {
  return (
    <AppLayout>
      <RoleGate allowedRoles={["OWNER", "ADMIN", "COLLECTOR"]}>
        <div className="grid gap-5">
        <div>
          <h2 className="text-2xl font-bold text-slate-950">รับชำระเงิน</h2>
          <p className="text-sm text-slate-500">แสดงสมาชิกที่ยังจ่ายไม่ครบใน workspace ปัจจุบัน</p>
        </div>
        <PaymentSearch />
        </div>
      </RoleGate>
    </AppLayout>
  );
}
