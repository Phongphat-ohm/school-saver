import { CancelPaymentButton } from "@/features/payments/components/CancelPaymentButton";
import { formatThaiDate } from "@/lib/date";
import { formatMoney } from "@/lib/money";

export function PaymentHistory({ transactions }: { transactions: any[] }) {
  return (
    <div className="grid gap-2">
      {transactions.map((transaction) => (
        <div key={transaction.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-slate-900">
              {formatThaiDate(transaction.paidAt)} • {transaction.paymentMethod.name}
            </p>
            {transaction.note ? <p className="text-xs text-slate-500">{transaction.note}</p> : null}
          </div>
          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <b>{formatMoney(transaction.amount)}</b>
            <CancelPaymentButton transactionId={transaction.id} compact />
          </div>
        </div>
      ))}
    </div>
  );
}
