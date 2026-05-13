import { AppLayout } from "@/components/layout/AppLayout";
import { RoleGate } from "@/components/layout/RoleGate";
import { Card } from "@/components/ui/Card";
import { PaymentMethodForm } from "@/features/payment-methods/components/PaymentMethodForm";
import { PaymentMethodTable } from "@/features/payment-methods/components/PaymentMethodTable";
import { getPaymentMethodsAction } from "@/features/payment-methods/actions";

export default async function PaymentMethodsPage() {
  const result = await getPaymentMethodsAction();
  const methods = result.success ? result.data : [];
  return (
    <AppLayout>
      <RoleGate allowedRoles={["OWNER", "ADMIN"]}>
        <div className="grid gap-5">
        <Card>
          <h2 className="mb-4 text-lg font-bold">เพิ่มวิธีชำระเงิน</h2>
          <PaymentMethodForm />
        </Card>
        <PaymentMethodTable methods={methods} />
        </div>
      </RoleGate>
    </AppLayout>
  );
}
