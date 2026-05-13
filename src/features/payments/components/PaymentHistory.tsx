import { formatMoney } from "@/lib/money";
import { formatThaiDate } from "@/lib/date";

export function PaymentHistory({ transactions }: { transactions: any[] }) {
  return (
    <div className="grid gap-2">
      {transactions.map((transaction) => (
        <div key={transaction.id} className="flex justify-between rounded-2xl border border-slate-200 bg-white p-3 text-sm">
          <span>{formatThaiDate(transaction.paidAt)} • {transaction.paymentMethod.name}</span>
          <b>{formatMoney(transaction.amount)}</b>
        </div>
      ))}
    </div>
  );
}
