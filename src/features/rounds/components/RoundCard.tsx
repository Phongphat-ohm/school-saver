"use client";

import Link from "next/link";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { RoundActionsMenu } from "@/features/rounds/components/RoundActionsMenu";
import { formatMoney } from "@/lib/money";
import { formatThaiDate } from "@/lib/date";

export function RoundCard({ round }: { round: any }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:hidden">
      <Link href={`/rounds/${round.id}`} className="block">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-950">{round.title}</p>
            <p className="text-sm text-slate-500">ครบกำหนด {formatThaiDate(round.dueDate)}</p>
          </div>
          <StatusBadge status={round.status} />
        </div>
        <p className="mt-3 text-sm text-slate-600">
          รับแล้ว {formatMoney(round.summary.totalPaidAmount)} / ค้าง {formatMoney(round.summary.totalOutstandingAmount)}
        </p>
      </Link>
      <div className="mt-4">
        <RoundActionsMenu round={round} fullWidth align="left" />
      </div>
    </div>
  );
}
