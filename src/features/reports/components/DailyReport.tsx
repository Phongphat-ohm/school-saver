import { formatMoney } from "@/lib/money";
import { formatThaiDate } from "@/lib/date";

export function DailyReport({ report }: { report: any }) {
  return (
    <div className="grid gap-3">
      <div className="rounded-2xl bg-white p-4 shadow-sm">ยอดรับรวม <b>{formatMoney(report.totalAmount)}</b> จาก {report.transactionCount} รายการ</div>
      {report.transactions.map((item: any) => (
        <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
          {formatThaiDate(item.paidAt)} • {item.member.fullName} • {item.paymentMethod.name} <b>{formatMoney(item.amount)}</b>
        </div>
      ))}
    </div>
  );
}
