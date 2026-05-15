"use client";

import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
  type ChartOptions,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import { Download, FileSpreadsheet, ReceiptText, TrendingUp, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/shared/StatCard";
import { CancelPaymentButton } from "@/features/payments/components/CancelPaymentButton";
import { formatInputDate, formatThaiDate } from "@/lib/date";
import { formatMoney } from "@/lib/money";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

type ChartItem = {
  label: string;
  amount: number;
  count: number;
};

const chartColors = ["#2563eb", "#059669", "#f97316", "#7c3aed", "#dc2626", "#0891b2", "#ca8a04", "#475569"];

function escapeCsv(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, rows: Array<Record<string, unknown>>) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.map(escapeCsv).join(","), ...rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(","))].join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function formatChartDate(label: string) {
  return new Date(label).toLocaleDateString("th-TH", { day: "2-digit", month: "short" });
}

const moneyTooltip = {
  callbacks: {
    label(context: any) {
      const label = context.dataset.label ? `${context.dataset.label}: ` : "";
      return `${label}${formatMoney(context.parsed.y ?? context.parsed.x ?? context.parsed)}`;
    },
  },
};

function DailyRevenueChart({ items }: { items: ChartItem[] }) {
  const visibleItems = items.slice(-14);
  const data = {
    labels: visibleItems.map((item) => formatChartDate(item.label)),
    datasets: [
      {
        label: "ยอดรับ",
        data: visibleItems.map((item) => item.amount),
        backgroundColor: "#2563eb",
        borderRadius: 8,
        maxBarThickness: 38,
      },
    ],
  };
  const options: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: moneyTooltip,
    },
    scales: {
      x: { grid: { display: false } },
      y: {
        beginAtZero: true,
        ticks: { callback: (value) => formatMoney(Number(value)).replace(" บาท", "") },
      },
    },
  };

  return (
    <Card className="border-0 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-slate-950">ยอดรับรายวัน</h3>
          <p className="text-sm text-slate-500">แสดง 14 วันล่าสุดในช่วงที่เลือก</p>
        </div>
        <TrendingUp className="text-blue-600" size={22} />
      </div>
      <div className="h-72">
        <Bar data={data} options={options} />
      </div>
    </Card>
  );
}

function DoughnutRevenueChart({ items }: { items: ChartItem[] }) {
  const visibleItems = items.slice(0, 8);
  const data = {
    labels: visibleItems.map((item) => item.label),
    datasets: [
      {
        data: visibleItems.map((item) => item.amount),
        backgroundColor: chartColors,
        borderColor: "#ffffff",
        borderWidth: 3,
      },
    ],
  };
  const options: ChartOptions<"doughnut"> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "62%",
    plugins: {
      legend: { position: "bottom", labels: { boxWidth: 12, usePointStyle: true } },
      tooltip: moneyTooltip,
    },
  };

  return (
    <Card className="border-0 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-slate-950">ช่องทางรับเงิน</h3>
          <p className="text-sm text-slate-500">ยอดรับแยกตามวิธีชำระเงิน</p>
        </div>
        <WalletCards className="text-emerald-600" size={22} />
      </div>
      <div className="h-72">
        {visibleItems.length ? <Doughnut data={data} options={options} /> : <EmptyChartText />}
      </div>
    </Card>
  );
}

function HorizontalRevenueChart({ title, helper, items }: { title: string; helper: string; items: ChartItem[] }) {
  const visibleItems = items.slice(0, 8);
  const data = {
    labels: visibleItems.map((item) => item.label),
    datasets: [
      {
        label: "ยอดรับ",
        data: visibleItems.map((item) => item.amount),
        backgroundColor: visibleItems.map((_, index) => chartColors[index % chartColors.length]),
        borderRadius: 8,
        maxBarThickness: 28,
      },
    ],
  };
  const options: ChartOptions<"bar"> = {
    indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: moneyTooltip,
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: { callback: (value) => formatMoney(Number(value)).replace(" บาท", "") },
      },
      y: { grid: { display: false } },
    },
  };

  return (
    <Card className="border-0 p-5">
      <div className="mb-4">
        <h3 className="text-lg font-black text-slate-950">{title}</h3>
        <p className="text-sm text-slate-500">{helper}</p>
      </div>
      <div className="h-72">{visibleItems.length ? <Bar data={data} options={options} /> : <EmptyChartText />}</div>
    </Card>
  );
}

function EmptyChartText() {
  return <div className="flex h-full items-center justify-center rounded-2xl bg-slate-50 text-sm text-slate-500">ยังไม่มีข้อมูลในช่วงวันที่เลือก</div>;
}

export function ReportDashboard({ report }: { report: any }) {
  const transactionRows = report.transactions.map((item: any) => ({
    วันที่: formatThaiDate(item.paidAt),
    รหัสสมาชิก: item.member.memberCode,
    เลขที่: item.member.studentNo ?? "",
    สมาชิก: item.member.fullName,
    ห้อง: item.member.classroom ?? "",
    รอบ: item.round.title,
    วิธีชำระเงิน: item.paymentMethod.name,
    ผู้รับเงิน: item.collectedBy.fullName || item.collectedBy.username,
    จำนวนเงิน: item.amount,
    หมายเหตุ: item.note ?? "",
  }));

  const summaryRows = [
    { รายการ: "ยอดรับรวม", ค่า: report.totalAmount },
    { รายการ: "จำนวนธุรกรรม", ค่า: report.transactionCount },
    { รายการ: "ยอดเฉลี่ยต่อรายการ", ค่า: report.averageTransactionAmount },
    { รายการ: "ยอดค้างรอบเปิด", ค่า: report.outstandingAmount },
    { รายการ: "จำนวนรายการค้าง", ค่า: report.outstandingCount },
  ];

  return (
    <div className="grid gap-5">
      <Card className="border-0 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-bold text-blue-700">Reports</p>
            <h2 className="text-2xl font-black text-slate-950">รายงานการรับชำระเงิน</h2>
            <p className="mt-1 text-sm text-slate-500">
              {formatThaiDate(report.startDate)} ถึง {formatThaiDate(report.endDate)}
            </p>
          </div>
          <form className="grid gap-3 sm:grid-cols-[160px_160px_auto] sm:items-end">
            <label className="grid gap-1 text-sm font-semibold text-slate-700">
              จากวันที่
              <input name="from" type="date" defaultValue={formatInputDate(report.startDate)} className="min-h-11 rounded-2xl border border-slate-200 px-3 text-sm" />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-slate-700">
              ถึงวันที่
              <input name="to" type="date" defaultValue={formatInputDate(report.endDate)} className="min-h-11 rounded-2xl border border-slate-200 px-3 text-sm" />
            </label>
            <Button type="submit" className="gap-2">
              <ReceiptText size={18} />
              ดูรายงาน
            </Button>
          </form>
        </div>
      </Card>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="ยอดรับรวม" value={formatMoney(report.totalAmount)} />
        <StatCard label="ธุรกรรม" value={report.transactionCount} helper="รายการในช่วงวันที่เลือก" />
        <StatCard label="เฉลี่ยต่อรายการ" value={formatMoney(report.averageTransactionAmount)} />
        <StatCard label="ยอดค้างรอบเปิด" value={formatMoney(report.outstandingAmount)} />
        <StatCard label="รอบที่เปิดอยู่" value={report.activeRoundCount} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <DailyRevenueChart items={report.dailySeries} />
        <DoughnutRevenueChart items={report.paymentMethodSeries} />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <HorizontalRevenueChart title="ยอดรับตามรอบ" helper="รอบที่มียอดรับสูงสุด" items={report.roundSeries} />
        <HorizontalRevenueChart title="ผู้รับเงิน" helper="ยอดรับแยกตามผู้บันทึก" items={report.collectorSeries} />
      </section>

      <Card className="border-0 p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-950">รายการรับชำระ</h3>
            <p className="text-sm text-slate-500">ข้อมูลนี้ใช้ export เพื่อตรวจบัญชีหรือส่งต่อได้</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" className="gap-2" onClick={() => downloadCsv("school-saver-report-summary.csv", summaryRows)}>
              <FileSpreadsheet size={18} />
              Export สรุป
            </Button>
            <Button type="button" className="gap-2" onClick={() => downloadCsv("school-saver-transactions.csv", transactionRows)} disabled={!transactionRows.length}>
              <Download size={18} />
              Export รายการ
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="w-full min-w-[880px] text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="p-3">วันที่</th>
                <th className="p-3">สมาชิก</th>
                <th className="p-3">รอบ</th>
                <th className="p-3">วิธีชำระ</th>
                <th className="p-3">ผู้รับเงิน</th>
                <th className="p-3 text-right">จำนวนเงิน</th>
                {report.canCancelPayments ? <th className="p-3 text-right">จัดการ</th> : null}
              </tr>
            </thead>
            <tbody>
              {report.transactions.slice(0, 25).map((item: any) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="p-3">{formatThaiDate(item.paidAt)}</td>
                  <td className="p-3">
                    <p className="font-semibold text-slate-900">{item.member.fullName}</p>
                    <p className="text-xs text-slate-500">{item.member.memberCode}</p>
                  </td>
                  <td className="p-3">{item.round.title}</td>
                  <td className="p-3">{item.paymentMethod.name}</td>
                  <td className="p-3">{item.collectedBy.fullName || item.collectedBy.username}</td>
                  <td className="p-3 text-right font-bold">{formatMoney(item.amount)}</td>
                  {report.canCancelPayments ? (
                    <td className="p-3 text-right">
                      <CancelPaymentButton transactionId={item.id} compact />
                    </td>
                  ) : null}
                </tr>
              ))}
              {!report.transactions.length ? (
                <tr>
                  <td className="p-5 text-center text-slate-500" colSpan={report.canCancelPayments ? 7 : 6}>
                    ยังไม่มีรายการรับชำระในช่วงวันที่เลือก
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        {report.transactions.length > 25 ? <p className="mt-3 text-xs text-slate-500">แสดง 25 รายการล่าสุด สามารถ export เพื่อดูทั้งหมดได้</p> : null}
      </Card>
    </div>
  );
}
