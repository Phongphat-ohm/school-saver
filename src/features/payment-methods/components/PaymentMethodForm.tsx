"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { paymentMethodTypeOptions } from "@/constants/payment-methods";
import { createPaymentMethodAction } from "@/features/payment-methods/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useActionLock } from "@/hooks/useActionLock";
import { showError, showLoading, showSuccess, closeLoading } from "@/lib/swal";

export function PaymentMethodForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const actionLock = useActionLock();
  const isSubmitting = pending || actionLock.locked;
  const [form, setForm] = useState({ name: "", type: "CASH", accountName: "", accountNumber: "", bankName: "", qrImageUrl: "" });
  const set = (key: keyof typeof form, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <form
      className="grid gap-3 md:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (!actionLock.acquire()) return;
        startTransition(async () => {
          try {
            showLoading("กำลังเพิ่มวิธีชำระเงิน");
            const result = await createPaymentMethodAction(form);
            closeLoading();
            if (result.success) {
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
      <Input label="ชื่อวิธีชำระเงิน" value={form.name} disabled={isSubmitting} onChange={(event) => set("name", event.target.value)} />
      <Select label="ประเภท" value={form.type} disabled={isSubmitting} onChange={(event) => set("type", event.target.value)} options={paymentMethodTypeOptions} />
      <Input label="ชื่อบัญชี" value={form.accountName} disabled={isSubmitting} onChange={(event) => set("accountName", event.target.value)} />
      <Input label="เลขบัญชี" value={form.accountNumber} disabled={isSubmitting} onChange={(event) => set("accountNumber", event.target.value)} />
      <Input label="ธนาคาร" value={form.bankName} disabled={isSubmitting} onChange={(event) => set("bankName", event.target.value)} />
      <Input label="QR image URL" value={form.qrImageUrl} disabled={isSubmitting} onChange={(event) => set("qrImageUrl", event.target.value)} />
      <Button disabled={isSubmitting}>{isSubmitting ? "กำลังเพิ่ม..." : "เพิ่มวิธีชำระเงิน"}</Button>
    </form>
  );
}
