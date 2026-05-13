"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Edit3 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { updateCollectionRoundAction } from "@/features/rounds/actions";
import { formatInputDate } from "@/lib/date";
import { closeLoading, showError, showLoading, showSuccess } from "@/lib/swal";

export function RoundEditButton({ round }: { round: any }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: round.title,
    description: round.description ?? "",
    targetAmount: round.targetAmount,
    startDate: formatInputDate(round.startDate),
    dueDate: formatInputDate(round.dueDate),
    fineEnabled: round.fineEnabled,
    fineType: round.fineType,
    fineAmount: round.fineAmount,
    fineMaxAmount: round.fineMaxAmount ?? "",
  });

  const set = (key: keyof typeof form, value: string | number | boolean) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <>
      <Button type="button" variant="secondary" className="gap-2" disabled={round.status !== "OPEN"} onClick={() => setOpen(true)}>
        <Edit3 size={16} />แก้ไข
      </Button>
      <Modal title="แก้ไขรอบเก็บเงิน" open={open} onClose={() => setOpen(false)}>
        <form
          className="grid gap-3 md:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            startTransition(async () => {
              showLoading("กำลังแก้ไขรอบ");
              const result = await updateCollectionRoundAction(round.id, {
                ...form,
                fineMaxAmount: form.fineMaxAmount === "" ? undefined : Number(form.fineMaxAmount),
              });
              closeLoading();
              if (result.success) {
                await showSuccess(result.message ?? "แก้ไขสำเร็จ");
                setOpen(false);
                router.refresh();
              } else await showError(result.message);
            });
          }}
        >
          <Input label="ชื่อรอบ" value={form.title} onChange={(event) => set("title", event.target.value)} />
          <Input label="รายละเอียด" value={form.description} onChange={(event) => set("description", event.target.value)} />
          <Input label="ยอดเป้าหมายต่อคน" type="number" value={form.targetAmount} onChange={(event) => set("targetAmount", Number(event.target.value))} />
          <Input label="วันที่เริ่มเก็บ" type="date" value={form.startDate} onChange={(event) => set("startDate", event.target.value)} />
          <Input label="วันที่ครบกำหนด" type="date" value={form.dueDate} onChange={(event) => set("dueDate", event.target.value)} />
          <Select
            label="ประเภทค่าปรับ"
            value={form.fineType}
            onChange={(event) => set("fineType", event.target.value)}
            options={[
              { value: "NONE", label: "ไม่มี" },
              { value: "DAILY", label: "รายวัน" },
              { value: "WEEKLY", label: "รายสัปดาห์" },
              { value: "FIXED", label: "คงที่" },
            ]}
          />
          <Input label="ค่าปรับ" type="number" value={form.fineAmount} onChange={(event) => set("fineAmount", Number(event.target.value))} />
          <Input label="ค่าปรับสูงสุด" type="number" value={form.fineMaxAmount} onChange={(event) => set("fineMaxAmount", event.target.value)} />
          <label className="flex min-h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700">
            <input type="checkbox" checked={form.fineEnabled} onChange={(event) => set("fineEnabled", event.target.checked)} />
            เปิดใช้ค่าปรับ
          </label>
          <Button disabled={pending} className="md:col-span-2">บันทึกการแก้ไข</Button>
        </form>
      </Modal>
    </>
  );
}
