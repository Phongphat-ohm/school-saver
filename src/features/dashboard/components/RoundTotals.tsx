import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { formatThaiDate } from "@/lib/date";
import { formatMoney } from "@/lib/money";

export function RoundTotals({ rounds }: { rounds: any[] }) {
  const totals = rounds.reduce(
    (sum, round) => ({
      target: sum.target + round.totalTargetAmount,
      paid: sum.paid + round.totalPaidAmount,
      fine: sum.fine + round.totalFineAmount,
      outstanding: sum.outstanding + round.totalOutstandingAmount,
    }),
    { target: 0, paid: 0, fine: 0, outstanding: 0 },
  );

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-950">ยอดรวมแยกตามรอบเก็บเงิน</h2>
          <p className="text-sm text-slate-500">ดูทั้งหมด {rounds.length} รอบ พร้อมยอดรับ ยอดค้าง และค่าปรับ</p>
        </div>
        <Link href="/rounds" className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-blue-50 px-3 text-sm font-bold text-blue-700">
          ดูทั้งหมด
          <ArrowRight size={16} />
        </Link>
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-4">
        <SummaryPill label="เป้าหมาย" value={formatMoney(totals.target)} />
        <SummaryPill label="รับแล้ว" value={formatMoney(totals.paid)} />
        <SummaryPill label="ค่าปรับ" value={formatMoney(totals.fine)} />
        <SummaryPill label="ค้าง" value={formatMoney(totals.outstanding)} />
      </div>

      <div className="grid gap-2">
        {rounds.map((round) => (
          <Link key={round.id} href={`/rounds/${round.id}`} className="grid gap-2 rounded-lg border border-slate-100 p-3 transition hover:border-blue-200 hover:bg-blue-50/40 lg:grid-cols-[1.3fr_repeat(4,1fr)_auto] lg:items-center">
            <div>
              <p className="font-bold text-slate-950">{round.title}</p>
              <p className="text-xs text-slate-500">ครบกำหนด {formatThaiDate(round.dueDate)} • {round.status}</p>
            </div>
            <Metric label="สมาชิก" value={`${round.totalMembers} คน`} />
            <Metric label="รับแล้ว" value={formatMoney(round.totalPaidAmount)} />
            <Metric label="ค้าง" value={formatMoney(round.totalOutstandingAmount)} />
            <Metric label="ค่าปรับ" value={formatMoney(round.totalFineAmount)} />
            <ArrowRight className="hidden justify-self-end text-blue-600 lg:block" size={18} />
          </Link>
        ))}
      </div>
    </section>
  );
}

function SummaryPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-50 p-3">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-1 font-black text-slate-950">{value}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="font-semibold text-slate-900">{value}</p>
    </div>
  );
}
