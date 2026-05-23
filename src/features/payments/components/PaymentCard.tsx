"use client";

import { useState } from "react";
import { WalletCards } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PaymentForm } from "@/features/payments/components/PaymentForm";
import { formatMoney } from "@/lib/money";

export function PaymentCard({
  row,
  paymentMethods,
  canPay = true,
  compact = false,
}: {
  row: any;
  paymentMethods: Array<{ id: string; name: string }>;
  canPay?: boolean;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const current = row.current;
  const outstandingAmount = current?.outstandingAmount ?? 0;
  const paymentDisabled = !canPay || outstandingAmount <= 0 || paymentMethods.length === 0;

  return (
    <div className={compact ? "rounded-lg border border-slate-200 bg-white shadow-sm transition hover:shadow-md" : "rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"}>
      <div className={compact ? "p-3" : "p-5 pb-4"}>
        <div className={compact ? "grid gap-2" : "flex items-start justify-between gap-4"}>
          <div className={compact ? "flex items-start justify-between gap-2" : "contents"}>
            <div className="min-w-0">
              <h3 className={compact ? "break-words text-base font-bold leading-5 text-slate-950" : "text-base font-semibold text-slate-900"}>
                {row.member.fullName}
              </h3>
              <p className={compact ? "mt-1 text-xs leading-5 text-slate-500" : "mt-0.5 text-sm text-slate-500"}>
                {row.member.studentNo ? `เลขที่ ${row.member.studentNo} • ` : ""}
                {row.member.memberCode ? `รหัส ${row.member.memberCode}` : row.round.title}
              </p>
              {row.member.status && row.member.status !== "ACTIVE" ? (
                <div className="mt-2">
                  <StatusBadge status={row.member.status} />
                </div>
              ) : null}
            </div>
            <div className="shrink-0">
              <StatusBadge status={current.currentStatus} />
            </div>
          </div>
          {compact ? <p className="truncate text-xs font-medium text-blue-700">{row.round.title}</p> : null}
        </div>

        <div className={compact ? "mt-3 grid grid-cols-2 gap-2 rounded-md bg-slate-50 p-2 text-xs sm:grid-cols-4" : "mt-5 grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-4"}>
          <div className="flex flex-col">
            <span className="mb-1 text-xs font-medium text-slate-500">เป้าหมาย</span>
            <span className={compact ? "font-semibold text-slate-900" : "text-sm font-semibold text-slate-900"}>{formatMoney(row.targetAmount)}</span>
          </div>
          <div className="flex flex-col">
            <span className="mb-1 text-xs font-medium text-slate-500">จ่ายแล้ว</span>
            <span className={compact ? "font-semibold text-emerald-600" : "text-sm font-semibold text-emerald-600"}>{formatMoney(row.paidAmount)}</span>
          </div>
          <div className="flex flex-col">
            <span className="mb-1 text-xs font-medium text-slate-500">ค่าปรับ</span>
            <span className={compact ? "font-semibold text-rose-500" : "text-sm font-semibold text-rose-500"}>{formatMoney(current.currentFine)}</span>
          </div>
          <div className="flex flex-col">
            <span className="mb-1 text-xs font-medium text-slate-500">ยอดค้าง</span>
            <span className={compact ? "font-semibold text-slate-900" : "text-sm font-semibold text-slate-900"}>{formatMoney(outstandingAmount)}</span>
          </div>
        </div>
      </div>

      <div className={compact ? "flex items-center justify-end rounded-b-lg border-t border-slate-100 bg-slate-50/50 p-2" : "flex items-center justify-end rounded-b-2xl border-t border-slate-100 bg-slate-50/50 p-4"}>
        <Button
          className={compact ? "min-h-9 w-full gap-2 px-3 py-2 text-xs sm:w-auto" : "w-full gap-2 sm:w-auto"}
          disabled={paymentDisabled}
          onClick={() => setOpen(true)}
          type="button"
        >
          <WalletCards size={compact ? 15 : 18} />
          {outstandingAmount <= 0 ? "จ่ายครบแล้ว" : "รับชำระเงิน"}
        </Button>
      </div>

      <Modal title="รับชำระเงิน" open={open} onClose={() => setOpen(false)}>
        <PaymentForm
          memberRoundId={row.id}
          outstandingAmount={outstandingAmount}
          paymentMethods={paymentMethods}
          onSuccess={() => setOpen(false)}
        />
      </Modal>
    </div>
  );
}
