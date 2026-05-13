import { formatMoney } from "@/lib/money";

export function MemberReport({ report }: { report: any }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <p className="font-bold">{report.member.fullName}</p>
      <p className="text-sm text-slate-500">จ่ายแล้ว {formatMoney(report.totalPaidAmount)} • ค้าง {formatMoney(report.totalOutstandingAmount)}</p>
    </div>
  );
}
