import { formatMoney } from "@/lib/money";
import { StatCard } from "@/components/shared/StatCard";

export function RoundSummary({ summary }: { summary: Record<string, number> }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="สมาชิกทั้งหมด" value={summary.totalMembers ?? 0} />
      <StatCard label="จ่ายครบ" value={summary.paidCount ?? 0} />
      <StatCard label="ยอดรับแล้ว" value={formatMoney(summary.totalPaidAmount ?? 0)} />
      <StatCard label="ยอดค้าง" value={formatMoney(summary.totalOutstandingAmount ?? 0)} />
    </div>
  );
}
