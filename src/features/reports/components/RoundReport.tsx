import { formatMoney } from "@/lib/money";

export function RoundReport({ report }: { report: any }) {
  return (
    <div className="grid gap-3">
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <p className="font-bold">{report.round.title}</p>
        <p className="text-sm text-slate-500">สมาชิก {report.totalMembers} • จ่ายครบ {report.paid} • ค้าง {report.overdue}</p>
        <p className="mt-2">รับแล้ว <b>{formatMoney(report.totalPaidAmount)}</b> / ค้าง <b>{formatMoney(report.totalOutstandingAmount)}</b></p>
      </div>
    </div>
  );
}
