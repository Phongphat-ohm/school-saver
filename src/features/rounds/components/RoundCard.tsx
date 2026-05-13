"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { RoundEditButton } from "@/features/rounds/components/RoundEditButton";
import { cancelRoundAction, closeRoundAction } from "@/features/rounds/actions";
import { formatMoney } from "@/lib/money";
import { formatThaiDate } from "@/lib/date";
import { closeLoading, showConfirm, showError, showLoading, showSuccess } from "@/lib/swal";

export function RoundCard({ round }: { round: any }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  async function runAction(action: () => Promise<any>, title: string, text: string) {
    if (!(await showConfirm(title, text))) return;
    showLoading();
    const result = await action();
    closeLoading();
    if (result.success) {
      await showSuccess(result.message ?? "ดำเนินการสำเร็จ");
      router.refresh();
    } else await showError(result.message);
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:hidden">
      <Link href={`/rounds/${round.id}`} className="block">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-slate-950">{round.title}</p>
            <p className="text-sm text-slate-500">ครบกำหนด {formatThaiDate(round.dueDate)}</p>
          </div>
          <StatusBadge status={round.status} />
        </div>
        <p className="mt-3 text-sm text-slate-600">รับแล้ว {formatMoney(round.summary.totalPaidAmount)} / ค้าง {formatMoney(round.summary.totalOutstandingAmount)}</p>
      </Link>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <RoundEditButton round={round} />
        <Button
          type="button"
          variant="secondary"
          className="gap-2"
          disabled={pending || round.status !== "OPEN"}
          onClick={() => {
            startTransition(() => runAction(() => closeRoundAction(round.id), "ปิดรอบ", `ต้องการปิดรอบ ${round.title} หรือไม่?`));
          }}
        >
          <LockKeyhole size={16} />ปิดรอบ
        </Button>
        <Button
          type="button"
          variant="danger"
          className="gap-2"
          disabled={pending || round.status === "CANCELLED"}
          onClick={() => {
            startTransition(() => runAction(() => cancelRoundAction(round.id), "ยกเลิกรอบ", `ต้องการยกเลิกรอบ ${round.title} หรือไม่?`));
          }}
        >
          <Ban size={16} />ยกเลิก
        </Button>
      </div>
    </div>
  );
}
