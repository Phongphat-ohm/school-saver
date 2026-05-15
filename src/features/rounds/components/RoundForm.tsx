"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus } from "lucide-react";
import { createCollectionRoundAction } from "@/features/rounds/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useActionLock } from "@/hooks/useActionLock";
import { showConfirm, showError, showLoading, showSuccess, closeLoading } from "@/lib/swal";

export function RoundForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const actionLock = useActionLock();
  const isSubmitting = pending || actionLock.locked;
  const [form, setForm] = useState({
    title: "",
    description: "",
    targetAmount: 100,
    startDate: "",
    dueDate: "",
    fineEnabled: true,
    fineType: "DAILY",
    fineAmount: 5,
    fineMaxAmount: "",
  });
  const set = (key: keyof typeof form, value: string | number | boolean) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <form
      className="grid gap-3 md:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (!actionLock.acquire()) return;
        startTransition(async () => {
          try {
            const confirmed = await showConfirm(
              "ยืนยันสร้างรอบ",
              "เมื่อสร้างรอบ ระบบจะสร้างรายการให้สมาชิกทุกคนใน workspace นี้ ต้องการดำเนินการต่อหรือไม่?",
            );
            if (!confirmed) return;
            showLoading("กำลังสร้างรอบ");
            const result = await createCollectionRoundAction({
              ...form,
              fineMaxAmount: form.fineMaxAmount === "" ? undefined : Number(form.fineMaxAmount),
            });
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
      <Input label="ชื่อรอบ" value={form.title} disabled={isSubmitting} onChange={(event) => set("title", event.target.value)} />
      <Input label="รายละเอียด" value={form.description} disabled={isSubmitting} onChange={(event) => set("description", event.target.value)} />
      <Input label="ยอดเป้าหมายต่อคน" type="number" value={form.targetAmount} disabled={isSubmitting} onChange={(event) => set("targetAmount", Number(event.target.value))} />
      <Input label="วันที่เริ่มเก็บ" type="date" value={form.startDate} disabled={isSubmitting} onChange={(event) => set("startDate", event.target.value)} />
      <Input label="วันที่ครบกำหนด" type="date" value={form.dueDate} disabled={isSubmitting} onChange={(event) => set("dueDate", event.target.value)} />
      <Select
        label="ประเภทค่าปรับ"
        value={form.fineType}
        disabled={isSubmitting}
        onChange={(event) => set("fineType", event.target.value)}
        options={[
          { value: "NONE", label: "ไม่มี" },
          { value: "DAILY", label: "รายวัน" },
          { value: "WEEKLY", label: "รายสัปดาห์" },
          { value: "FIXED", label: "คงที่" },
        ]}
      />
      <Input label="ค่าปรับ" type="number" value={form.fineAmount} disabled={isSubmitting} onChange={(event) => set("fineAmount", Number(event.target.value))} />
      <Input label="ค่าปรับสูงสุด" type="number" value={form.fineMaxAmount} disabled={isSubmitting} onChange={(event) => set("fineMaxAmount", event.target.value)} />
      <label className="flex min-h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700">
        <input type="checkbox" checked={form.fineEnabled} disabled={isSubmitting} onChange={(event) => set("fineEnabled", event.target.checked)} />
        เปิดใช้ค่าปรับ
      </label>
      <div className="flex items-end">
        <Button disabled={isSubmitting} className="w-full gap-2">
          <CalendarPlus size={18} />
          {isSubmitting ? "กำลังสร้างรอบ..." : "สร้างรอบ"}
        </Button>
      </div>
    </form>
  );
}
