import { formatMoney } from "@/lib/money";
import { StatCard } from "@/components/shared/StatCard";
import { CalendarClock, CircleAlert, PiggyBank, ReceiptText, UsersRound, WalletCards } from "lucide-react";

const actionCards = [
  {
    label: "รอบเก็บเงิน",
    helper: "เปิดรอบและติดตามยอด",
    icon: CalendarClock,
    className: "from-red-500 to-orange-400",
    valueKey: "activeRounds",
  },
  {
    label: "รับชำระเงิน",
    helper: "บันทึกจ่ายสะสมรายวัน",
    icon: WalletCards,
    className: "from-indigo-500 to-blue-500",
    valueKey: "todayPaidAmount",
    money: true,
  },
  {
    label: "คนค้างจ่าย",
    helper: "เช็กยอดค้างและค่าปรับ",
    icon: CircleAlert,
    className: "from-amber-400 to-yellow-500",
    valueKey: "overdueCount",
  },
];

export function DashboardCards({ summary }: { summary: any }) {
  return (
    <div className="grid gap-5">
      <section className="overflow-hidden rounded-[2rem] bg-white p-5 shadow-sm">
        <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
          <div className="rounded-[1.5rem] bg-[#eef3ff] p-6">
            <p className="text-sm font-bold text-blue-700">Dashboard</p>
            <h2 className="mt-3 text-3xl font-black text-slate-950">Welcome Back</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
              เก็บเงินห้องง่ายขึ้น ตรวจสอบได้ทุกยอด พร้อมแยกข้อมูลตาม workspace ปัจจุบันอย่างชัดเจน
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-white p-4">
                <div className="mb-3 grid size-10 place-items-center rounded-2xl bg-green-100 text-green-700">
                  <PiggyBank size={20} />
                </div>
                <p className="text-xs text-slate-500">ยอดรับแล้ว</p>
                <p className="text-lg font-black text-slate-950">{formatMoney(summary.totalPaidAmount)}</p>
              </div>
              <div className="rounded-2xl bg-white p-4">
                <div className="mb-3 grid size-10 place-items-center rounded-2xl bg-red-100 text-red-700">
                  <ReceiptText size={20} />
                </div>
                <p className="text-xs text-slate-500">ยอดค้าง</p>
                <p className="text-lg font-black text-slate-950">{formatMoney(summary.totalOutstandingAmount)}</p>
              </div>
              <div className="rounded-2xl bg-white p-4">
                <div className="mb-3 grid size-10 place-items-center rounded-2xl bg-sky-100 text-sky-700">
                  <UsersRound size={20} />
                </div>
                <p className="text-xs text-slate-500">สมาชิก</p>
                <p className="text-lg font-black text-slate-950">{summary.totalMembers}</p>
              </div>
            </div>
          </div>
          <div className="rounded-[1.5rem] bg-[#11152e] p-5 text-white">
            <p className="text-sm text-slate-400">สรุปวันนี้</p>
            <p className="mt-3 text-3xl font-black">{formatMoney(summary.todayPaidAmount)}</p>
            <p className="mt-1 text-sm text-slate-400">{summary.todayTransactionCount} รายการรับเงิน</p>
            <div className="mt-6 rounded-2xl bg-white/10 p-4">
              <p className="text-xs text-slate-400">ค่าปรับรวม</p>
              <p className="mt-1 text-xl font-bold">{formatMoney(summary.totalFineAmount)}</p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-950">หมวดการทำงาน</h3>
          <span className="text-xs font-semibold text-slate-500">SchoolSaver modules</span>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {actionCards.map((item) => {
            const Icon = item.icon;
            const value = item.money ? formatMoney(summary[item.valueKey]) : summary[item.valueKey];
            return (
              <div key={item.label} className={`rounded-[1.5rem] bg-gradient-to-br ${item.className} p-5 text-white shadow-sm`}>
                <div className="mb-5 flex items-center justify-between">
                  <div className="grid size-11 place-items-center rounded-2xl bg-white/20">
                    <Icon size={22} />
                  </div>
                  <span className="text-xl font-black">{value}</span>
                </div>
                <p className="font-bold">{item.label}</p>
                <p className="mt-1 text-sm text-white/75">{item.helper}</p>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="ยอดเป้าหมายรวม" value={formatMoney(summary.totalTargetAmount)} />
        <StatCard label="จ่ายครบ" value={summary.paidCount} />
        <StatCard label="จ่ายบางส่วน" value={summary.partialCount} />
        <StatCard label="ยังไม่จ่าย" value={summary.unpaidCount} />
      </div>
    </div>
  );
}
