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
import Link from "next/link";
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
const filterLabelClass = "grid min-w-0 gap-1 text-sm font-semibold text-slate-700";
const filterFieldClass = "min-h-11 min-w-0 rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100";

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
  return new Date(label).toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok", day: "2-digit", month: "short" });
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
    <Card className="rounded-[1.5rem] border-0 p-4 sm:p-5">
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
    <Card className="rounded-[1.5rem] border-0 p-4 sm:p-5">
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
    <Card className="rounded-[1.5rem] border-0 p-4 sm:p-5">
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
  const pagination = report.pagination ?? { page: 1, pageSize: 25, total: report.transactions.length, totalPages: 1 };

  function pageHref(page: number) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(report.filters ?? {})) {
      if (value !== undefined && value !== null && String(value) !== "") params.set(key, String(value));
    }
    params.set("page", String(page));
    return `/reports?${params.toString()}`;
  }

  return (
    <div className="grid min-w-0 gap-5">
      <Card className="rounded-[1.5rem] border-0 p-4 sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-bold text-blue-700">รายงาน</p>
            <h2 className="text-2xl font-black text-slate-950">รายงานการรับชำระเงิน</h2>
            <p className="mt-1 text-sm text-slate-500">
              {formatThaiDate(report.startDate)} ถึง {formatThaiDate(report.endDate)}
            </p>
          </div>
          <div className="rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700">
            ทั้งหมด {pagination.total.toLocaleString("th-TH")} รายการ
          </div>
        </div>

        <form className="mt-5 grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          <input name="page" type="hidden" value="1" />
          <label className={filterLabelClass}>
              จากวันที่
            <input name="from" type="date" defaultValue={formatInputDate(report.startDate)} className={filterFieldClass} />
          </label>
          <label className={filterLabelClass}>
              ถึงวันที่
            <input name="to" type="date" defaultValue={formatInputDate(report.endDate)} className={filterFieldClass} />
          </label>
          <label className={`${filterLabelClass} sm:col-span-2 lg:col-span-2`}>
              ค้นหา
            <input name="q" defaultValue={report.filters?.q ?? ""} className={filterFieldClass} placeholder="ชื่อ/รหัส/หมายเหตุ" />
          </label>
          <label className={filterLabelClass}>
              รอบ
            <select name="roundId" defaultValue={report.filters?.roundId ?? ""} className={filterFieldClass}>
                <option value="">ทุกรอบ</option>
                {report.filterOptions.rounds.map((round: any) => <option key={round.id} value={round.id}>{round.title}</option>)}
              </select>
          </label>
          <label className={filterLabelClass}>
              วิธีชำระ
            <select name="paymentMethodId" defaultValue={report.filters?.paymentMethodId ?? ""} className={filterFieldClass}>
                <option value="">ทุกวิธี</option>
                {report.filterOptions.paymentMethods.map((method: any) => <option key={method.id} value={method.id}>{method.name}</option>)}
              </select>
          </label>
          <label className={filterLabelClass}>
              ผู้รับเงิน
            <select name="collectedById" defaultValue={report.filters?.collectedById ?? ""} className={filterFieldClass}>
                <option value="">ทุกคน</option>
                {report.filterOptions.collectors.map((collector: any) => <option key={collector.id} value={collector.id}>{collector.fullName || collector.username}</option>)}
              </select>
          </label>
          <label className={filterLabelClass}>
              ยอดต่ำสุด
            <input name="minAmount" type="number" min="0" defaultValue={report.filters?.minAmount ?? ""} className={filterFieldClass} />
          </label>
          <label className={filterLabelClass}>
              ยอดสูงสุด
            <input name="maxAmount" type="number" min="0" defaultValue={report.filters?.maxAmount ?? ""} className={filterFieldClass} />
          </label>
          <label className={filterLabelClass}>
              ต่อหน้า
            <select name="pageSize" defaultValue={report.filters?.pageSize ?? "25"} className={filterFieldClass}>
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
          </label>
          <div className="flex items-end sm:col-span-2 lg:col-span-1">
            <Button type="submit" className="w-full gap-2">
              <ReceiptText size={18} />
              กรอง
            </Button>
          </div>
        </form>
      </Card>

      <section className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        <StatCard label="ยอดรับรวม" value={formatMoney(report.totalAmount)} />
        <StatCard label="ธุรกรรม" value={report.transactionCount} helper="รายการในช่วงวันที่เลือก" />
        <StatCard label="เฉลี่ยต่อรายการ" value={formatMoney(report.averageTransactionAmount)} />
        <StatCard label="ยอดค้างรอบเปิด" value={formatMoney(report.outstandingAmount)} />
        <StatCard label="รอบที่เปิดอยู่" value={report.activeRoundCount} />
      </section>

      <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <DailyRevenueChart items={report.dailySeries} />
        <DoughnutRevenueChart items={report.paymentMethodSeries} />
      </section>

      <section className="grid min-w-0 gap-4 xl:grid-cols-2">
        <HorizontalRevenueChart title="ยอดรับตามรอบ" helper="รอบที่มียอดรับสูงสุด" items={report.roundSeries} />
        <HorizontalRevenueChart title="ผู้รับเงิน" helper="ยอดรับแยกตามผู้บันทึก" items={report.collectorSeries} />
      </section>

      <Card className="min-w-0 rounded-[1.5rem] border-0 p-4 sm:p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-950">รายการรับชำระ</h3>
            <p className="text-sm text-slate-500">
              แสดงหน้า {pagination.page.toLocaleString("th-TH")} จาก {pagination.totalPages.toLocaleString("th-TH")} ทั้งหมด {pagination.total.toLocaleString("th-TH")} รายการ
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" className="gap-2" onClick={() => downloadCsv("school-saver-report-summary.csv", summaryRows)}>
              <FileSpreadsheet size={18} />
              Export สรุป
            </Button>
            <Button type="button" className="gap-2" onClick={() => downloadCsv("school-saver-transactions-page.csv", transactionRows)} disabled={!transactionRows.length}>
              <Download size={18} />
              Export หน้านี้
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
              {report.transactions.map((item: any) => (
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
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">ระบบดึง transaction เฉพาะหน้าปัจจุบันเพื่อให้รายงานโหลดเร็วขึ้น</p>
          <div className="flex items-center gap-2">
            <Link
              className={`rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold ${pagination.page <= 1 ? "pointer-events-none opacity-50" : "hover:bg-slate-50"}`}
              href={pageHref(Math.max(1, pagination.page - 1))}
            >
              ก่อนหน้า
            </Link>
            <span className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700">
              {pagination.page.toLocaleString("th-TH")} / {pagination.totalPages.toLocaleString("th-TH")}
            </span>
            <Link
              className={`rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold ${pagination.page >= pagination.totalPages ? "pointer-events-none opacity-50" : "hover:bg-slate-50"}`}
              href={pageHref(Math.min(pagination.totalPages, pagination.page + 1))}
            >
              ถัดไป
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
