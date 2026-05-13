import { formatMoney } from "@/lib/money";
import { StatusBadge } from "@/components/shared/StatusBadge";

export function RoundMemberList({ memberRounds }: { memberRounds: any[] }) {
  return (
    <div className="grid gap-3">
      {memberRounds.map((row) => (
        <div key={row.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-950">{row.member.fullName}</p>
              <p className="text-sm text-slate-500">เลขที่ {row.member.studentNo ?? "-"} • {row.round?.title ?? ""}</p>
            </div>
            <StatusBadge status={row.current?.currentStatus ?? row.status} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <p>เป้าหมาย <b>{formatMoney(row.targetAmount)}</b></p>
            <p>จ่ายแล้ว <b>{formatMoney(row.paidAmount)}</b></p>
            <p>ค่าปรับ <b>{formatMoney(row.current?.currentFine ?? row.fineAmount)}</b></p>
            <p>ค้าง <b>{formatMoney(row.current?.outstandingAmount ?? row.remainingAmount)}</b></p>
          </div>
        </div>
      ))}
    </div>
  );
}
