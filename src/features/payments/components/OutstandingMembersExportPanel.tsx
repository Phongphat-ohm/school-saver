"use client";

import { useTransition } from "react";
import Link from "next/link";
import { AlertTriangle, Download, ReceiptText } from "lucide-react";
import { StatCard } from "@/components/shared/StatCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { createOutstandingMembersExportAction } from "@/features/reports/actions";
import { downloadRowsAsCsv } from "@/lib/csv";
import { formatThaiDate } from "@/lib/date";
import { formatMoney } from "@/lib/money";
import { showError, showSuccess } from "@/lib/swal";

const filterLabelClass = "grid min-w-0 gap-1 text-sm font-semibold text-slate-700";
const filterFieldClass = "min-h-11 min-w-0 rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100";

export function OutstandingMembersExportPanel({ report }: { report: any }) {
  const [pending, startTransition] = useTransition();
  const rows = report.rows ?? [];
  const filters = report.filters ?? {};
  const summary = report.summary ?? { totalOutstandingAmount: 0, totalPaidAmount: 0, totalRequiredAmount: 0 };

  function exportOutstanding() {
    startTransition(async () => {
      const result = await createOutstandingMembersExportAction({
        q: filters.q,
        roundId: filters.roundId,
        status: filters.status,
        roundScope: filters.roundScope,
      });
      if (!result.success) {
        await showError(result.message);
        return;
      }
      if (!result.data.rows.length) {
        await showError("ไม่มีข้อมูลสำหรับส่งออก");
        return;
      }
      downloadRowsAsCsv(result.data.filename, result.data.rows);
      await showSuccess(`ส่งออก ${result.data.rows.length.toLocaleString("th-TH")} รายการแล้ว`);
    });
  }

  return (
    <Card className="min-w-0 rounded-[1.5rem] border-0 p-4 sm:p-5">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-amber-700">
            <AlertTriangle size={20} />
            <p className="text-sm font-black">รายงานค้างชำระ</p>
          </div>
          <h3 className="mt-1 text-xl font-black text-slate-950">ส่งออกสมาชิกที่ยังไม่ได้จ่ายหรือยังจ่ายไม่ครบ</h3>
          <p className="mt-1 text-sm text-slate-500">คำนวณยอดค้างล่าสุดตามค่าปรับของแต่ละรอบ และส่งออก CSV ตามตัวกรองนี้</p>
        </div>
        <Button type="button" className="gap-2" disabled={pending || !report.totalRows} onClick={exportOutstanding}>
          <Download size={18} />
          {pending ? "กำลังส่งออก..." : "ส่งออก CSV"}
        </Button>
      </div>

      <form className="grid min-w-0 gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className={filterLabelClass}>
          ค้นหา
          <input name="q" defaultValue={filters.q ?? ""} className={filterFieldClass} placeholder="ชื่อ/รหัส/เลขที่/ห้อง/เบอร์" />
        </label>
        <label className={filterLabelClass}>
          รอบ
          <select name="roundId" defaultValue={filters.roundId ?? ""} className={filterFieldClass}>
            <option value="">ทุกรอบ</option>
            {report.filterOptions.rounds.map((round: any) => <option key={round.id} value={round.id}>{round.title}</option>)}
          </select>
        </label>
        <label className={filterLabelClass}>
          สถานะ
          <select name="status" defaultValue={filters.status ?? "ALL"} className={filterFieldClass}>
            <option value="ALL">ทุกสถานะค้างชำระ</option>
            <option value="UNPAID">ยังไม่จ่าย</option>
            <option value="PARTIAL">จ่ายบางส่วน</option>
            <option value="OVERDUE">เลยกำหนด</option>
            <option value="PARTIAL_OVERDUE">ค้างบางส่วนและเลยกำหนด</option>
          </select>
        </label>
        <label className={filterLabelClass}>
          ขอบเขตรอบ
          <select name="roundScope" defaultValue={filters.roundScope ?? "OPEN"} className={filterFieldClass}>
            <option value="OPEN">เฉพาะรอบเปิด</option>
            <option value="ALL_ACTIVE">รวมรอบปิดที่ยังค้าง</option>
          </select>
        </label>
        <div className="flex items-end gap-2">
          <Button type="submit" className="min-w-0 flex-1 gap-2">
            <ReceiptText size={18} />
            กรอง
          </Button>
          <Link className="grid min-h-11 place-items-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50" href="/overdue">
            ล้าง
          </Link>
        </div>
      </form>

      <section className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="รายการค้างชำระ" value={(report.totalRows ?? 0).toLocaleString("th-TH")} />
        <StatCard label="ยอดค้างรวม" value={formatMoney(summary.totalOutstandingAmount)} />
        <StatCard label="จ่ายแล้ว" value={formatMoney(summary.totalPaidAmount)} />
        <StatCard label="ยอดที่ต้องจ่าย" value={formatMoney(summary.totalRequiredAmount)} />
      </section>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-100">
        <table className="w-full min-w-[960px] text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="p-3">สมาชิก</th>
              <th className="p-3">ห้อง</th>
              <th className="p-3">รอบ</th>
              <th className="p-3">ครบกำหนด</th>
              <th className="p-3">สถานะ</th>
              <th className="p-3 text-right">ต้องจ่าย</th>
              <th className="p-3 text-right">จ่ายแล้ว</th>
              <th className="p-3 text-right">ค่าปรับ</th>
              <th className="p-3 text-right">ค้าง</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row: any) => (
              <tr key={row.id} className="border-t border-slate-100">
                <td className="p-3">
                  <p className="font-semibold text-slate-900">{row.member.fullName}</p>
                  <p className="text-xs text-slate-500">{row.member.memberCode}{row.member.studentNo ? ` · เลขที่ ${row.member.studentNo}` : ""}</p>
                </td>
                <td className="p-3">{row.member.classroom ?? "-"}</td>
                <td className="p-3">{row.round.title}</td>
                <td className="p-3">{formatThaiDate(row.round.dueDate)}</td>
                <td className="p-3">
                  <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700">{row.currentStatusLabel}</span>
                </td>
                <td className="p-3 text-right">{formatMoney(row.current.totalRequiredAmount)}</td>
                <td className="p-3 text-right">{formatMoney(row.paidAmount)}</td>
                <td className="p-3 text-right">{formatMoney(row.current.currentFine)}</td>
                <td className="p-3 text-right font-black text-rose-700">{formatMoney(row.current.outstandingAmount)}</td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td className="p-5 text-center text-slate-500" colSpan={9}>ไม่พบสมาชิกค้างชำระตามเงื่อนไขนี้</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {report.totalRows > rows.length ? (
        <p className="mt-3 text-xs text-slate-500">แสดงตัวอย่าง {rows.length.toLocaleString("th-TH")} รายการแรก จากทั้งหมด {report.totalRows.toLocaleString("th-TH")} รายการ ปุ่ม CSV จะส่งออกครบตามตัวกรอง</p>
      ) : null}
    </Card>
  );
}
