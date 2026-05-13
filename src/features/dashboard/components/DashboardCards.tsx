import Link from "next/link";
import { ArrowRight, CircleAlert, PiggyBank, ReceiptText, UsersRound, WalletCards } from "lucide-react";
import { StatCard } from "@/components/shared/StatCard";
import { formatMoney } from "@/lib/money";

function percent(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function StatusChart({ summary }: { summary: any }) {
  const total = summary.paidCount + summary.partialCount + summary.unpaidCount + summary.overdueCount;
  const items = [
    { label: "จ่ายครบ", value: summary.paidCount, color: "bg-emerald-500" },
    { label: "บางส่วน", value: summary.partialCount, color: "bg-amber-400" },
    { label: "ยังไม่จ่าย", value: summary.unpaidCount, color: "bg-slate-400" },
    { label: "เลยกำหนด", value: summary.overdueCount, color: "bg-rose-500" },
  ];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-slate-950">ภาพรวมสถานะ</p>
          <p className="text-xs text-slate-500">สถานะการจ่ายใน workspace นี้</p>
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{total} รายการ</span>
      </div>

      <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-slate-100">
        {items.map((item) => (
          <div key={item.label} className={item.color} style={{ width: `${percent(item.value, total)}%` }} />
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        {items.map((item) => (
          <div key={item.label} className="rounded-md bg-slate-50 p-2">
            <div className="flex items-center gap-2 text-slate-500">
              <span className={`size-2 rounded-full ${item.color}`} />
              {item.label}
            </div>
            <p className="mt-1 text-base font-black text-slate-950">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function MoneyChart({ summary }: { summary: any }) {
  const total = Math.max(summary.totalTargetAmount, summary.totalPaidAmount + summary.totalOutstandingAmount, 1);
  const items = [
    { label: "รับแล้ว", value: summary.totalPaidAmount, color: "bg-emerald-500" },
    { label: "ค้าง", value: summary.totalOutstandingAmount, color: "bg-rose-500" },
    { label: "ค่าปรับ", value: summary.totalFineAmount, color: "bg-amber-400" },
  ];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-slate-950">ยอดเงินรวม</p>
          <p className="text-xs text-slate-500">เทียบกับเป้าหมาย {formatMoney(summary.totalTargetAmount)}</p>
        </div>
        <PiggyBank className="text-blue-600" size={20} />
      </div>

      <div className="grid gap-3">
        {items.map((item) => (
          <div key={item.label} className="grid gap-1">
            <div className="flex justify-between text-xs font-semibold text-slate-600">
              <span>{item.label}</span>
              <span>{formatMoney(item.value)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div className={`h-full rounded-full ${item.color}`} style={{ width: `${Math.min(percent(item.value, total), 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardCards({ summary }: { summary: any }) {
  return (
    <div className="grid gap-4">
      <section className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="rounded-lg border border-blue-100 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-blue-700">SchoolSaver</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950 sm:text-3xl">จัดการเงินห้องวันนี้</h2>
              <p className="mt-1 text-sm text-slate-500">เข้ามาแล้วรับเงินได้ทันที พร้อมเห็นยอดค้างและยอดรับแบบเร็ว</p>
            </div>
            <Link
              href="/payments"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"
            >
              <WalletCards size={18} />
              รับชำระเงิน
              <ArrowRight size={16} />
            </Link>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-emerald-50 p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold text-emerald-700">
                <PiggyBank size={16} />
                รับแล้ว
              </div>
              <p className="text-lg font-black text-slate-950">{formatMoney(summary.totalPaidAmount)}</p>
            </div>
            <div className="rounded-lg bg-rose-50 p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold text-rose-700">
                <ReceiptText size={16} />
                ยอดค้าง
              </div>
              <p className="text-lg font-black text-slate-950">{formatMoney(summary.totalOutstandingAmount)}</p>
            </div>
            <div className="rounded-lg bg-sky-50 p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold text-sky-700">
                <UsersRound size={16} />
                สมาชิก
              </div>
              <p className="text-lg font-black text-slate-950">{summary.totalMembers}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-slate-950 p-4 text-white shadow-sm">
          <p className="text-sm text-slate-300">รับเงินวันนี้</p>
          <p className="mt-2 text-3xl font-black">{formatMoney(summary.todayPaidAmount)}</p>
          <p className="mt-1 text-sm text-slate-400">{summary.todayTransactionCount} รายการ</p>
          <Link href="/payments" className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-white px-3 text-sm font-bold text-slate-950">
            รับเงินด่วน
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <MoneyChart summary={summary} />
        <StatusChart summary={summary} />
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="รอบที่เปิดอยู่" value={summary.activeRounds} />
        <StatCard label="ค่าปรับรวม" value={formatMoney(summary.totalFineAmount)} />
        <StatCard label="ค้างบางส่วน" value={summary.partialCount} />
        <StatCard label="เลยกำหนด" value={summary.overdueCount} />
      </div>
    </div>
  );
}
