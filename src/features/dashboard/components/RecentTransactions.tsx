import { Card } from "@/components/ui/Card";
import { formatMoney } from "@/lib/money";
import { formatThaiDate } from "@/lib/date";
import { FileText } from "lucide-react";

export function RecentTransactions({ transactions }: { transactions: any[] }) {
  return (
    <Card className="rounded-[1.5rem] border-0">
      <h2 className="mb-3 text-lg font-bold text-slate-950">รายการรับเงินล่าสุด</h2>
      <div className="grid gap-2">
        {transactions.map((item) => (
          <div key={item.id} className="flex justify-between gap-3 rounded-2xl bg-slate-50 p-3 text-sm">
            <span className="flex items-center gap-2"><FileText size={16} className="text-blue-500" /> {item.member.fullName} • {formatThaiDate(item.paidAt)}</span>
            <b>{formatMoney(item.amount)}</b>
          </div>
        ))}
      </div>
    </Card>
  );
}
