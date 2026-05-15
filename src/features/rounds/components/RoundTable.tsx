"use client";

import Link from "next/link";
import { DataTable } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { RoundActionsMenu } from "@/features/rounds/components/RoundActionsMenu";
import { formatMoney } from "@/lib/money";
import { formatThaiDate } from "@/lib/date";

export function RoundTable({ rounds }: { rounds: any[] }) {
  return (
    <DataTable>
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-slate-500">
          <tr>
            <th className="p-3">รอบ</th>
            <th className="p-3">ครบกำหนด</th>
            <th className="p-3">สมาชิก</th>
            <th className="p-3">รับแล้ว</th>
            <th className="p-3">ค้าง</th>
            <th className="p-3">สถานะ</th>
            <th className="p-3 text-right">จัดการ</th>
          </tr>
        </thead>
        <tbody>
          {rounds.map((round) => (
            <tr key={round.id} className="border-t border-slate-100">
              <td className="p-3 font-medium text-blue-700">
                <Link href={`/rounds/${round.id}`}>{round.title}</Link>
              </td>
              <td className="p-3">{formatThaiDate(round.dueDate)}</td>
              <td className="p-3">{round.summary.totalMembers}</td>
              <td className="p-3">{formatMoney(round.summary.totalPaidAmount)}</td>
              <td className="p-3">{formatMoney(round.summary.totalOutstandingAmount)}</td>
              <td className="p-3">
                <StatusBadge status={round.status} />
              </td>
              <td className="p-3">
                <div className="flex justify-end">
                  <RoundActionsMenu round={round} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </DataTable>
  );
}
