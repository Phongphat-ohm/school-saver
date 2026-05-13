"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { PaymentForm } from "@/features/payments/components/PaymentForm";
import { formatMoney } from "@/lib/money";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { WalletCards } from "lucide-react";

export function PaymentCard({
  row,
  paymentMethods
}: {
  row: any;
  paymentMethods: Array<{ id: string; name: string }>
}) {
  const [open, setOpen] = useState(false);
  const current = row.current;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md">

      {/* --- ส่วนหัว (Header) --- */}
      <div className="p-5 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">{row.member.fullName}</h3>
            <p className="mt-0.5 text-sm text-slate-500">{row.round.title}</p>
          </div>
          <StatusBadge status={current.currentStatus} />
        </div>

        {/* --- ส่วนข้อมูลตัวเลข (Stats Grid) --- */}
        {/* ใช้กรอบสีเทาอ่อนด้านหลังเพื่อกรุ๊ปข้อมูลตัวเลขให้อ่านง่ายและไม่ปนกับชื่อ */}
        <div className="mt-5 grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-4">
          <div className="flex flex-col">
            <span className="mb-1 text-xs font-medium text-slate-500">เป้าหมาย</span>
            <span className="text-sm font-semibold text-slate-900">{formatMoney(row.targetAmount)}</span>
          </div>
          <div className="flex flex-col">
            <span className="mb-1 text-xs font-medium text-slate-500">จ่ายแล้ว</span>
            {/* สามารถเติมสีให้ตัวเลขได้ เช่น สีเขียวสำหรับยอดที่จ่ายแล้ว */}
            <span className="text-sm font-semibold text-emerald-600">{formatMoney(row.paidAmount)}</span>
          </div>
          <div className="flex flex-col">
            <span className="mb-1 text-xs font-medium text-slate-500">ค่าปรับ</span>
            <span className="text-sm font-semibold text-rose-500">{formatMoney(current.currentFine)}</span>
          </div>
          <div className="flex flex-col">
            <span className="mb-1 text-xs font-medium text-slate-500">ยอดค้าง</span>
            <span className="text-sm font-semibold text-slate-900">{formatMoney(current.outstandingAmount)}</span>
          </div>
        </div>
      </div>

      {/* --- ส่วนปุ่มกด (Action Footer) --- */}
      {/* ตีเส้นขีดคั่นและดันปุ่มไปทางขวาบน Desktop (กว้างเต็มจอบน Mobile) */}
      <div className="flex items-center justify-end border-t border-slate-100 bg-slate-50/50 p-4 rounded-b-2xl">
        <Button
          className="w-full gap-2 sm:w-auto"
          onClick={() => setOpen(true)}
          type="button"
        >
          <WalletCards size={18} />
          รับชำระเงิน
        </Button>
      </div>

      {/* --- Modal --- */}
      <Modal title="รับชำระเงิน" open={open} onClose={() => setOpen(false)}>
        <PaymentForm
          memberRoundId={row.id}
          outstandingAmount={current.outstandingAmount}
          paymentMethods={paymentMethods}
        />
      </Modal>

    </div>
  );
}