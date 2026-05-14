"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, LockKeyhole, UnlockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { RoundEditButton } from "@/features/rounds/components/RoundEditButton";
import { cancelRoundAction, closeRoundAction, openRoundAction } from "@/features/rounds/actions";
import { formatMoney } from "@/lib/money";
import { formatThaiDate } from "@/lib/date";
import { closeLoading, showConfirm, showError, showLoading, showSuccess } from "@/lib/swal";

export function RoundTable({ rounds }: { rounds: any[] }) {
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
    <DataTable>
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-slate-500">
          <tr>
            <th className="p-3">รอบ</th>
            <th className="p-3">ครบกำหนด</th>
            <th className="p-3">สมาชิก</th>
            <th className="p-3">รับแล้ว</th>
            <th className="p-3">ค้าง</th>
            <th className="p-3">สถานะ</th>
            <th className="p-3 text-right">จัดการ</th>
          </tr>
        </thead>
        <tbody>
          {rounds.map((round) => (
            <tr key={round.id} className="border-t border-slate-100">
              <td className="p-3 font-medium text-blue-700"><Link href={`/rounds/${round.id}`}>{round.title}</Link></td>
              <td className="p-3">{formatThaiDate(round.dueDate)}</td>
              <td className="p-3">{round.summary.totalMembers}</td>
              <td className="p-3">{formatMoney(round.summary.totalPaidAmount)}</td>
              <td className="p-3">{formatMoney(round.summary.totalOutstandingAmount)}</td>
              <td className="p-3"><StatusBadge status={round.status} /></td>
              <td className="p-3">
                <div className="flex flex-wrap justify-end gap-2">
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
                    variant="secondary"
                    className="gap-2"
                    disabled={pending || round.status !== "CLOSED"}
                    onClick={() => {
                      startTransition(() => runAction(() => openRoundAction(round.id), "เปิดรอบ", `ต้องการเปิดรอบ ${round.title} กลับมาใช้งานหรือไม่?`));
                    }}
                  >
                    <UnlockKeyhole size={16} />เปิดรอบ
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    className="gap-2"
                    disabled={pending || round.status === "CANCELLED"}
                    onClick={() => {
                      startTransition(() => runAction(() => cancelRoundAction(round.id), "ยกเลิกรอบ", `ต้องการยกเลิกรอบ ${round.title} หรือไม่? ยอดค้างของรอบนี้จะไม่แสดงในหน้ารับชำระ`));
                    }}
                  >
                    <Ban size={16} />ยกเลิก
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </DataTable>
  );
}
