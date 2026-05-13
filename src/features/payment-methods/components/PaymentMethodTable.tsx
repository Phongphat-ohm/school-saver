"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Edit3, Trash2 } from "lucide-react";
import type { PaymentMethod } from "@/generated/prisma/client";
import { paymentMethodTypeLabels, paymentMethodTypeOptions } from "@/constants/payment-methods";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { disablePaymentMethodAction, updatePaymentMethodAction } from "@/features/payment-methods/actions";
import { closeLoading, showConfirm, showError, showLoading, showSuccess } from "@/lib/swal";

export function PaymentMethodTable({ methods }: { methods: PaymentMethod[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<PaymentMethod | null>(null);
  const [form, setForm] = useState({ name: "", type: "CASH", accountName: "", accountNumber: "", bankName: "", qrImageUrl: "" });

  function openEdit(method: PaymentMethod) {
    setEditing(method);
    setForm({
      name: method.name,
      type: method.type,
      accountName: method.accountName ?? "",
      accountNumber: method.accountNumber ?? "",
      bankName: method.bankName ?? "",
      qrImageUrl: method.qrImageUrl ?? "",
    });
  }

  return (
    <>
      <div className="grid gap-3">
        {methods.map((method) => (
          <div key={method.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <p className="font-semibold text-slate-950">{method.name}</p>
              <p className="text-sm text-slate-500">{paymentMethodTypeLabels[method.type]} {method.bankName ? `• ${method.bankName}` : ""}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={method.status} />
              <Button type="button" variant="secondary" className="gap-2" onClick={() => openEdit(method)}>
                <Edit3 size={16} />แก้ไข
              </Button>
              <Button
                type="button"
                variant="danger"
                className="gap-2"
                onClick={() => {
                  startTransition(async () => {
                    if (!(await showConfirm("ปิดใช้งานวิธีชำระเงิน", `ต้องการปิดใช้งาน ${method.name} หรือไม่?`))) return;
                    showLoading();
                    const result = await disablePaymentMethodAction(method.id);
                    closeLoading();
                    if (result.success) {
                      await showSuccess(result.message ?? "ปิดใช้งานแล้ว");
                      router.refresh();
                    } else await showError(result.message);
                  });
                }}
              >
                <Trash2 size={16} />ปิดใช้งาน
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Modal title="แก้ไขวิธีชำระเงิน" open={!!editing} onClose={() => setEditing(null)}>
        <form
          className="grid gap-3 md:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!editing) return;
            startTransition(async () => {
              showLoading("กำลังแก้ไขวิธีชำระเงิน");
              const result = await updatePaymentMethodAction(editing.id, form);
              closeLoading();
              if (result.success) {
                await showSuccess(result.message ?? "แก้ไขสำเร็จ");
                setEditing(null);
                router.refresh();
              } else await showError(result.message);
            });
          }}
        >
          <Input label="ชื่อวิธีชำระเงิน" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          <Select label="ประเภท" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })} options={paymentMethodTypeOptions} />
          <Input label="ชื่อบัญชี" value={form.accountName} onChange={(event) => setForm({ ...form, accountName: event.target.value })} />
          <Input label="เลขบัญชี" value={form.accountNumber} onChange={(event) => setForm({ ...form, accountNumber: event.target.value })} />
          <Input label="ธนาคาร" value={form.bankName} onChange={(event) => setForm({ ...form, bankName: event.target.value })} />
          <Input label="QR image URL" value={form.qrImageUrl} onChange={(event) => setForm({ ...form, qrImageUrl: event.target.value })} />
          <Button disabled={pending} className="md:col-span-2">บันทึกการแก้ไข</Button>
        </form>
      </Modal>
    </>
  );
}
