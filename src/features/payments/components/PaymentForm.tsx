"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { payMemberRoundAction } from "@/features/payments/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { showConfirm, showError, showLoading, showSuccess, closeLoading } from "@/lib/swal";

export function PaymentForm({
  memberRoundId,
  outstandingAmount,
  paymentMethods,
  onSuccess,
}: {
  memberRoundId: string;
  outstandingAmount: number;
  paymentMethods: Array<{ id: string; name: string }>;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [amount, setAmount] = useState(Math.min(outstandingAmount, 10));
  const [paymentMethodId, setPaymentMethodId] = useState(paymentMethods[0]?.id ?? "");
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          if (!(await showConfirm("ยืนยันรับเงิน", `รับเงินจำนวน ${amount} บาท ใช่หรือไม่?`))) return;
          showLoading("กำลังบันทึกรับเงิน");
          const result = await payMemberRoundAction({ memberRoundId, amount, paymentMethodId, paidAt, note });
          closeLoading();
          if (result.success) {
            onSuccess?.();
            await showSuccess(result.message ?? "สำเร็จ");
            router.refresh();
          } else await showError(result.message);
        });
      }}
    >
      <div className="flex flex-wrap gap-2">
        {[10, 20, 50, 100, outstandingAmount].map((value, index) => (
          <Button key={`${value}-${index}`} type="button" variant="secondary" onClick={() => setAmount(value)}>
            {index === 4 ? "จ่ายยอดค้างทั้งหมด" : value}
          </Button>
        ))}
      </div>
      <Input label="จำนวนเงิน" type="number" value={amount} onChange={(event) => setAmount(Number(event.target.value))} />
      <Select label="วิธีชำระเงิน" value={paymentMethodId} onChange={(event) => setPaymentMethodId(event.target.value)} options={paymentMethods.map((method) => ({ label: method.name, value: method.id }))} />
      <Input label="วันที่จ่าย" type="date" value={paidAt} onChange={(event) => setPaidAt(event.target.value)} />
      <Input label="หมายเหตุ" value={note} onChange={(event) => setNote(event.target.value)} />
      <Button disabled={pending}>ยืนยันรับเงิน</Button>
    </form>
  );
}
