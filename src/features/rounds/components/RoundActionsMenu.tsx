"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, Edit3, LockKeyhole, MoreHorizontal, RotateCcw, UnlockKeyhole } from "lucide-react";
import clsx from "clsx";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { cancelRoundAction, closeRoundAction, openRoundAction, restoreCancelledRoundAction, updateCollectionRoundAction } from "@/features/rounds/actions";
import { useActionLock } from "@/hooks/useActionLock";
import { formatInputDate } from "@/lib/date";
import { closeLoading, showConfirm, showError, showLoading, showSuccess } from "@/lib/swal";

type RoundActionsMenuProps = {
  round: any;
  align?: "left" | "right";
  fullWidth?: boolean;
};

export function RoundActionsMenu({ round, align = "right", fullWidth = false }: RoundActionsMenuProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const actionLock = useActionLock();
  const isSubmitting = pending || actionLock.locked;
  const [editOpen, setEditOpen] = useState(false);
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

  async function runAction(action: () => Promise<any>, title: string, text: string, trigger?: HTMLElement | null) {
    if (!actionLock.acquire()) return;
    trigger?.closest("details")?.removeAttribute("open");
    try {
      if (!(await showConfirm(title, text))) return;
      showLoading();
      const result = await action();
      closeLoading();
      if (result.success) {
        await showSuccess(result.message ?? "ดำเนินการสำเร็จ");
        router.refresh();
      } else await showError(result.message);
    } finally {
      closeLoading();
      actionLock.release();
    }
  }

  const itemClass =
    "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-45";

  return (
    <div className={clsx("relative inline-flex", fullWidth && "w-full")}>
      <details className={clsx("group relative inline-flex", fullWidth && "w-full")}>
        <summary
          className={clsx(
            "inline-flex min-h-11 cursor-pointer list-none items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-200 [&::-webkit-details-marker]:hidden",
            fullWidth && "w-full",
          )}
        >
          <MoreHorizontal size={18} />
          จัดการ
        </summary>
        <div
          className={clsx(
            "absolute top-full z-30 mt-2 w-56 rounded-2xl border border-slate-100 bg-white p-2 shadow-xl",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          <button
            type="button"
            className={itemClass}
            disabled={isSubmitting || round.status !== "OPEN"}
            onClick={(event) => {
              event.currentTarget.closest("details")?.removeAttribute("open");
              setEditOpen(true);
            }}
          >
            <Edit3 size={16} />
            แก้ไขรอบ
          </button>
          <button
            type="button"
            className={itemClass}
            disabled={isSubmitting || round.status !== "OPEN"}
            onClick={(event) => {
              const trigger = event.currentTarget;
              startTransition(() => runAction(() => closeRoundAction(round.id), "ปิดรอบ", `ต้องการปิดรอบ ${round.title} หรือไม่?`, trigger));
            }}
          >
            <LockKeyhole size={16} />
            ปิดรอบ
          </button>
          <button
            type="button"
            className={itemClass}
            disabled={isSubmitting || round.status !== "CLOSED"}
            onClick={(event) => {
              const trigger = event.currentTarget;
              startTransition(() => runAction(() => openRoundAction(round.id), "เปิดรอบ", `ต้องการเปิดรอบ ${round.title} กลับมาใช้งานหรือไม่?`, trigger));
            }}
          >
            <UnlockKeyhole size={16} />
            เปิดรอบ
          </button>
          <button
            type="button"
            className={itemClass}
            disabled={isSubmitting || round.status !== "CANCELLED"}
            onClick={(event) => {
              const trigger = event.currentTarget;
              startTransition(() =>
                runAction(
                  () => restoreCancelledRoundAction(round.id),
                  "ยกเลิกการยกเลิกรอบ",
                  `ต้องการคืนรอบ ${round.title} กลับมาใช้งานและแสดงยอดค้างอีกครั้งหรือไม่?`,
                  trigger,
                ),
              );
            }}
          >
            <RotateCcw size={16} />
            คืนรอบ
          </button>
          <div className="my-1 border-t border-slate-100" />
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-45"
            disabled={isSubmitting || round.status === "CANCELLED"}
            onClick={(event) => {
              const trigger = event.currentTarget;
              startTransition(() =>
                runAction(
                  () => cancelRoundAction(round.id),
                  "ยกเลิกรอบ",
                  `ต้องการยกเลิกรอบ ${round.title} หรือไม่? ยอดค้างของรอบนี้จะไม่แสดงในหน้ารับชำระ`,
                  trigger,
                ),
              );
            }}
          >
            <Ban size={16} />
            ยกเลิกรอบ
          </button>
        </div>
      </details>

      <Modal title="แก้ไขรอบเก็บเงิน" open={editOpen} onClose={() => setEditOpen(false)}>
        <form
          className="grid gap-3 md:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!actionLock.acquire()) return;
            startTransition(async () => {
              try {
                showLoading("กำลังแก้ไขรอบ");
                const result = await updateCollectionRoundAction(round.id, {
                  ...form,
                  fineMaxAmount: form.fineMaxAmount === "" ? undefined : Number(form.fineMaxAmount),
                });
                closeLoading();
                if (result.success) {
                  await showSuccess(result.message ?? "แก้ไขสำเร็จ");
                  setEditOpen(false);
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
          <Button disabled={isSubmitting} className="md:col-span-2">
            {isSubmitting ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
