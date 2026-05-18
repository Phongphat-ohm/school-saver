"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { payMemberRoundAction } from "@/features/payments/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useActionLock } from "@/hooks/useActionLock";
import { formatInputDate } from "@/lib/date";
import { showConfirm, showError, showLoading, showSuccess, closeLoading } from "@/lib/swal";

export function PaymentForm({
  memberRoundId,
  outstandingAmount,
  paymentMethods,
  defaultPaymentMethodId,
  onSuccess,
}: {
  memberRoundId: string;
  outstandingAmount: number;
  paymentMethods: Array<{ id: string; name: string }>;
  defaultPaymentMethodId?: string;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const actionLock = useActionLock();
  const isSubmitting = pending || actionLock.locked;
  const [amount, setAmount] = useState(Math.min(outstandingAmount, 10));
  const [paymentMethodId, setPaymentMethodId] = useState(defaultPaymentMethodId ?? paymentMethods[0]?.id ?? "");
  const [paidAt, setPaidAt] = useState(formatInputDate(new Date()));
  const [note, setNote] = useState("");

  useEffect(() => {
    setPaymentMethodId((current) => {
      if (defaultPaymentMethodId && paymentMethods.some((method) => method.id === defaultPaymentMethodId)) return defaultPaymentMethodId;
      if (paymentMethods.some((method) => method.id === current)) return current;
      return paymentMethods[0]?.id ?? "";
    });
  }, [defaultPaymentMethodId, paymentMethods]);

  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (!actionLock.acquire()) return;
        startTransition(async () => {
          try {
            if (!(await showConfirm("ยืนยันรับเงิน", `รับเงินจำนวน ${amount} บาท ใช่หรือไม่?`))) return;
            showLoading("กำลังบันทึกรับเงิน");
            const result = await payMemberRoundAction({ memberRoundId, amount, paymentMethodId, paidAt, note });
            closeLoading();
            if (result.success) {
              onSuccess?.();
              await showSuccess(result.message ?? "สำเร็จ");
              router.refresh();
            } else await showError(result.message);
          } finally {
            closeLoading();
            actionLock.release();
          }
        });
      }}
    >
      <div className="flex flex-wrap gap-2">
        {[10, 20, 50, 100, outstandingAmount].map((value, index) => (
          <Button key={`${value}-${index}`} type="button" variant="secondary" disabled={isSubmitting} onClick={() => setAmount(value)}>
            {index === 4 ? "จ่ายยอดค้างทั้งหมด" : value}
          </Button>
        ))}
      </div>
      <Input label="จำนวนเงิน" type="number" value={amount} disabled={isSubmitting} onChange={(event) => setAmount(Number(event.target.value))} />
      <Select
        label="วิธีชำระเงิน"
        value={paymentMethodId}
        disabled={isSubmitting}
        onChange={(event) => setPaymentMethodId(event.target.value)}
        options={paymentMethods.map((method) => ({ label: method.name, value: method.id }))}
      />
      <Input label="วันที่จ่าย" type="date" value={paidAt} disabled={isSubmitting} onChange={(event) => setPaidAt(event.target.value)} />
      <Input label="หมายเหตุ" value={note} disabled={isSubmitting} onChange={(event) => setNote(event.target.value)} />
      <Button disabled={isSubmitting}>{isSubmitting ? "กำลังบันทึก..." : "ยืนยันรับเงิน"}</Button>
    </form>
  );
}
