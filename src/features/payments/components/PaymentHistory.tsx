"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Edit3, Filter, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { cancelPaymentTransactionAction, updatePaymentTransactionAction } from "@/features/payments/actions";
import { formatInputDate, formatThaiDateTime } from "@/lib/date";
import { formatMoney } from "@/lib/money";
import { closeLoading, showConfirm, showError, showLoading, showSuccess } from "@/lib/swal";

type PaymentHistoryFilters = {
  roundId?: string;
  member?: string;
  startDate?: string;
  endDate?: string;
};

export function PaymentHistory({
  transactions,
  rounds,
  paymentMethods,
  filters,
}: {
  transactions: any[];
  rounds: Array<{ id: string; title: string }>;
  paymentMethods: Array<{ id: string; name: string }>;
  filters: PaymentHistoryFilters;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    roundId: filters.roundId ?? "",
    member: filters.member ?? "",
    startDate: filters.startDate ?? "",
    endDate: filters.endDate ?? "",
  });
  const [editing, setEditing] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ amount: 0, paymentMethodId: "", paidAt: "", note: "" });

  const totalAmount = useMemo(() => transactions.reduce((sum, item) => sum + item.amount, 0), [transactions]);

  function applyFilters() {
    const params = new URLSearchParams();
    if (form.roundId) params.set("roundId", form.roundId);
    if (form.member.trim()) params.set("member", form.member.trim());
    if (form.startDate) params.set("startDate", form.startDate);
    if (form.endDate) params.set("endDate", form.endDate);
    router.push(`/payments/history${params.toString() ? `?${params.toString()}` : ""}`);
  }

  function openEdit(transaction: any) {
    setEditing(transaction);
    setEditForm({
      amount: transaction.amount,
      paymentMethodId: transaction.paymentMethod.id,
      paidAt: formatInputDate(transaction.paidAt),
      note: transaction.note ?? "",
    });
  }

  function deleteTransaction(transaction: any) {
    startTransition(async () => {
      const confirmed = await showConfirm("ลบรายการชำระเงิน", `ต้องการลบรายการของ ${transaction.member.fullName} จำนวน ${transaction.amount} บาทหรือไม่?`);
      if (!confirmed) return;
      showLoading("กำลังลบรายการชำระเงิน");
      const result = await cancelPaymentTransactionAction(transaction.id);
      closeLoading();
      if (result.success) {
        await showSuccess(result.message ?? "ลบรายการชำระเงินแล้ว");
        router.refresh();
      } else await showError(result.message);
    });
  }

  return (
    <section className="grid gap-4">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_160px_160px_auto] lg:items-end">
          <Select
            label="รอบเก็บเงิน"
            value={form.roundId}
            onChange={(event) => setForm({ ...form, roundId: event.target.value })}
            options={[{ label: "ทุกรอบ", value: "" }, ...rounds.map((round) => ({ label: round.title, value: round.id }))]}
          />
          <Input label="สมาชิก" value={form.member} onChange={(event) => setForm({ ...form, member: event.target.value })} placeholder="ชื่อ, รหัส, เลขที่, เบอร์โทร" />
          <Input label="ตั้งแต่วันที่" type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} />
          <Input label="ถึงวันที่" type="date" value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} />
          <Button type="button" className="gap-2" onClick={applyFilters}>
            <Filter size={18} />
            กรอง
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-blue-100 bg-blue-50 p-4">
        <p className="font-bold text-blue-950">พบ {transactions.length} รายการ</p>
        <p className="text-sm font-semibold text-blue-800">ยอดรวม {formatMoney(totalAmount)}</p>
      </div>

      {transactions.length ? (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="hidden grid-cols-[1.2fr_1fr_1fr_120px_120px] gap-3 border-b border-slate-200 bg-slate-50 p-3 text-xs font-bold text-slate-500 md:grid">
            <span>สมาชิก</span>
            <span>รอบเก็บเงิน</span>
            <span>วันที่ชำระ</span>
            <span className="text-right">จำนวนเงิน</span>
            <span className="text-right">จัดการ</span>
          </div>
          <div className="divide-y divide-slate-100">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="grid gap-3 p-3 md:grid-cols-[1.2fr_1fr_1fr_120px_120px] md:items-center">
                <div>
                  <p className="font-semibold text-slate-950">{transaction.member.fullName}</p>
                  <p className="text-xs text-slate-500">
                    {transaction.member.studentNo ? `เลขที่ ${transaction.member.studentNo} • ` : ""}
                    รหัส {transaction.member.memberCode}
                  </p>
                </div>
                <p className="text-sm text-slate-700">{transaction.round.title}</p>
                <p className="text-sm text-slate-600">{formatThaiDateTime(transaction.paidAt)}</p>
                <p className="font-bold text-emerald-700 md:text-right">{formatMoney(transaction.amount)}</p>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="secondary" className="gap-2 px-3" disabled={pending} onClick={() => openEdit(transaction)}>
                    <Edit3 size={16} />
                  </Button>
                  <Button type="button" variant="danger" className="gap-2 px-3" disabled={pending} onClick={() => deleteTransaction(transaction)}>
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState title="ไม่พบประวัติการชำระเงิน" />
      )}

      <Modal title="แก้ไขรายการชำระเงิน" open={!!editing} onClose={() => setEditing(null)}>
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!editing) return;
            startTransition(async () => {
              showLoading("กำลังแก้ไขรายการชำระเงิน");
              const result = await updatePaymentTransactionAction(editing.id, editForm);
              closeLoading();
              if (result.success) {
                await showSuccess(result.message ?? "แก้ไขรายการชำระเงินแล้ว");
                setEditing(null);
                router.refresh();
              } else await showError(result.message);
            });
          }}
        >
          <Input label="จำนวนเงิน" type="number" value={editForm.amount} disabled={pending} onChange={(event) => setEditForm({ ...editForm, amount: Number(event.target.value) })} />
          <Select
            label="วิธีชำระเงิน"
            value={editForm.paymentMethodId}
            disabled={pending}
            onChange={(event) => setEditForm({ ...editForm, paymentMethodId: event.target.value })}
            options={paymentMethods.map((method) => ({ label: method.name, value: method.id }))}
          />
          <Input label="วันที่ชำระ" type="date" value={editForm.paidAt} disabled={pending} onChange={(event) => setEditForm({ ...editForm, paidAt: event.target.value })} />
          <Input label="หมายเหตุ" value={editForm.note} disabled={pending} onChange={(event) => setEditForm({ ...editForm, note: event.target.value })} />
          <Button disabled={pending}>{pending ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}</Button>
        </form>
      </Modal>
    </section>
  );
}
