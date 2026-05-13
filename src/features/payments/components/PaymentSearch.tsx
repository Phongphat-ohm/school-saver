import { getPaymentMethodsAction } from "@/features/payment-methods/actions";
import { getUnpaidAndPartialPaymentsAction } from "@/features/payments/actions";
import { RoundMemberList } from "@/features/rounds/components/RoundMemberList";

export async function PaymentSearch({ roundId }: { roundId?: string }) {
  const [rowsResult, methodsResult] = await Promise.all([getUnpaidAndPartialPaymentsAction(roundId), getPaymentMethodsAction()]);
  const rows = rowsResult.success ? rowsResult.data : [];
  const methods = methodsResult.success ? methodsResult.data : [];

  return <RoundMemberList memberRounds={rows} paymentMethods={methods} />;
}
