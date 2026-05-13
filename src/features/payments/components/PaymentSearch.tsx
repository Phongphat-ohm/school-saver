import { getPaymentMethodsAction } from "@/features/payment-methods/actions";
import { getUnpaidAndPartialPaymentsAction } from "@/features/payments/actions";
import { PaymentCard } from "@/features/payments/components/PaymentCard";

export async function PaymentSearch({ roundId }: { roundId?: string }) {
  const [rowsResult, methodsResult] = await Promise.all([getUnpaidAndPartialPaymentsAction(roundId), getPaymentMethodsAction()]);
  const rows = rowsResult.success ? rowsResult.data : [];
  const methods = methodsResult.success ? methodsResult.data : [];
  return (
    <div className="grid gap-3">
      {rows.map((row) => (
        <PaymentCard key={row.id} row={row} paymentMethods={methods} />
      ))}
    </div>
  );
}
