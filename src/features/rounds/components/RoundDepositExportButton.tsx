"use client";

import { FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { paymentMethodTypeLabels } from "@/constants/payment-methods";
import { downloadRowsAsCsv } from "@/lib/csv";
import { formatInputDate, formatThaiDate, toDateKey } from "@/lib/date";

type RoundDepositExportButtonProps = {
  round: {
    title: string;
    targetAmount: number;
    startDate: Date | string;
    dueDate: Date | string;
    fineEnabled: boolean;
    fineType: "NONE" | "DAILY" | "WEEKLY" | "FIXED";
    fineAmount: number;
    fineMaxAmount: number | null;
  };
  dayList: Array<Date | string>;
  memberRounds: Array<{
    id: string;
    paidAmount: number;
    remainingAmount: number;
    fineAmount: number;
    totalRequiredAmount: number;
    member: {
      memberCode: string;
      studentNo: string | null;
      fullName: string;
    };
    transactions?: Array<{
      id: string;
      amount: number;
      paidAt: Date | string;
      note: string | null;
      paymentMethod?: {
        id: string;
        name: string;
        type: keyof typeof paymentMethodTypeLabels;
      } | null;
    }>;
  }>;
};

export function RoundDepositExportButton({ round, dayList, memberRounds }: RoundDepositExportButtonProps) {
  function exportCsv() {
    const dateKeys = dayList.map((day) => toDateKey(day));
    const dateLabels = dayList.map((day) => formatThaiDate(day));
    const rows = memberRounds.map((memberRound) => {
      const dailyPayments = new Map<string, { amount: number; methods: string[] }>();

      for (const transaction of memberRound.transactions ?? []) {
        const key = toDateKey(transaction.paidAt);
        const item = dailyPayments.get(key) ?? { amount: 0, methods: [] };
        item.amount += transaction.amount;
        const method = formatPaymentMethod(transaction.paymentMethod);
        if (method && !item.methods.includes(method)) item.methods.push(method);
        dailyPayments.set(key, item);
      }

      const row: Record<string, string | number> = {
        เลขที่: memberRound.member.studentNo ?? "",
        รหัสสมาชิก: memberRound.member.memberCode,
        ชื่อ: memberRound.member.fullName,
      };

      for (const [index, key] of dateKeys.entries()) {
        const payment = dailyPayments.get(key);
        row[dateLabels[index]] = payment?.amount ?? "";
        row[`วิธีชำระ ${dateLabels[index]}`] = payment?.methods.join("\n") ?? "";
      }

      row["รวมจ่าย"] = memberRound.paidAmount;
      row["ค่าปรับรวม"] = memberRound.fineAmount;
      row["ยอดที่ต้องจ่ายรวม"] = memberRound.totalRequiredAmount;
      row["ยอดค้าง"] = memberRound.remainingAmount;
      return row;
    });

    downloadRowsAsCsv(`school-saver-${sanitizeFilename(round.title)}-${formatInputDate(round.dueDate)}.csv`, rows);
  }

  return (
    <Button type="button" variant="secondary" className="gap-2" onClick={exportCsv} disabled={!memberRounds.length}>
      <FileSpreadsheet size={18} />
      Export CSV
    </Button>
  );
}

function formatPaymentMethod(method: { name: string; type: keyof typeof paymentMethodTypeLabels } | null | undefined) {
  if (!method) return "";
  const typeLabel = paymentMethodTypeLabels[method.type];
  return typeLabel && typeLabel !== method.name ? `${method.name} (${typeLabel})` : method.name;
}

function sanitizeFilename(value: string) {
  return value.replace(/[\\/:*?"<>|]+/g, "-").trim() || "round";
}
