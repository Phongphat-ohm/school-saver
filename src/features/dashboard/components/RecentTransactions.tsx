import { FileText } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { formatThaiDate } from "@/lib/date";
import { formatMoney } from "@/lib/money";

export function RecentTransactions({ transactions }: { transactions: any[] }) {
  return (
    <Card className="rounded-lg border-0">
      <h2 className="mb-3 text-base font-bold text-slate-950">รายการรับเงินล่าสุด</h2>
      <div className="grid gap-2">
        {transactions.length ? (
          transactions.map((item) => (
            <div key={item.id} className="flex justify-between gap-3 rounded-lg bg-slate-50 p-3 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <FileText size={16} className="shrink-0 text-blue-500" />
                <span className="truncate">{item.member.fullName} • {formatThaiDate(item.paidAt)}</span>
              </span>
              <b className="shrink-0">{formatMoney(item.amount)}</b>
            </div>
          ))
        ) : (
          <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">ยังไม่มีรายการรับเงิน</p>
        )}
      </div>
    </Card>
  );
}
